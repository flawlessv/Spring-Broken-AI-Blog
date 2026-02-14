import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ragQueryStream } from "@/lib/ai/rag";

/**
 * 流式 RAG 查询 API
 * 使用 Server-Sent Events (SSE) 实现流式输出
 */
export async function POST(request: NextRequest) {
  try {
    // 权限验证
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: "未授权" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { question, options } = body;

    if (!question) {
      return new Response(JSON.stringify({ error: "问题不能为空" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;

        const closeStream = () => {
          if (closed) return;
          closed = true;
          controller.close();
        };

        const sendEvent = (type: string, data: any) => {
          if (closed || request.signal.aborted) return;

          try {
            const message = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(message));
          } catch (error) {
            console.error("SSE 推送失败:", error);
            closeStream();
          }
        };

        const handleAbort = () => {
          closeStream();
        };

        request.signal.addEventListener("abort", handleAbort, { once: true });

        try {
          if (request.signal.aborted) {
            closeStream();
            return;
          }

          // 执行流式 RAG 查询
          await ragQueryStream(
            question,
            {
              limit: options?.limit || 5,
              maxTokens: options?.maxTokens || 1000,
            },
            {
              onSources: (sources) => {
                sendEvent("sources", { sources });
              },
              onChunk: (chunk) => {
                sendEvent("chunk", { chunk });
              },
              onComplete: (result) => {
                sendEvent("complete", {
                  tokensUsed: result.tokensUsed,
                });
                closeStream();
              },
              onError: (error) => {
                sendEvent("error", {
                  error: error instanceof Error ? error.message : "查询失败",
                });
                closeStream();
              },
            },
            request.signal
          );

          if (!closed) {
            closeStream();
          }
        } catch (error) {
          console.error("流式 RAG 查询错误:", error);
          sendEvent("error", {
            error: error instanceof Error ? error.message : "查询失败",
          });
          closeStream();
        } finally {
          request.signal.removeEventListener("abort", handleAbort);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("流式 RAG 查询错误:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "查询失败",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
