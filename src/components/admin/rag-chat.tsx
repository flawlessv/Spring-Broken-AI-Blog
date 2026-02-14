"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Send,
  Loader2,
  Bot,
  User,
  FileText,
  Sparkles,
  RefreshCw,
  Database,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  timestamp: Date;
  mode?: "rag" | "fallback"; // 是否为降级模式
}

interface Source {
  postId: string;
  slug: string;
  title: string;
  excerpt: string;
  score: number;
}

interface RAGChatProps {
  trigger?: React.ReactNode;
}

const STORAGE_KEY = "rag-chat-history";

interface IndexStatus {
  indexed: number;
  total: number;
  lastIndexed?: string;
}

export default function RAGChat({ trigger }: RAGChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexStatus, setIndexStatus] = useState<IndexStatus | null>(null);
  const [showIndexPanel, setShowIndexPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const shouldAutoScrollRef = useRef(true);

  // 从 localStorage 加载对话历史
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // 恢复 Date 对象
        setMessages(
          parsed.map((m: Message) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }))
        );
      }
    } catch (e) {
      console.error("加载对话历史失败:", e);
    }
  }, []);

  // 保存对话历史到 localStorage（防抖，避免流式输出期间频繁写入）
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        try {
          // 只保留最近 50 条消息
          const toSave = messages.slice(-50);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        } catch (e) {
          console.error("保存对话历史失败:", e);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  // 滚动到底部
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const isNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceToBottom < 120;
  };

  const handleMessagesScroll = () => {
    shouldAutoScrollRef.current = isNearBottom();
  };

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      scrollToBottom(isLoading ? "auto" : "smooth");
    }
  }, [messages]);

  // 聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // 弹窗关闭时中断流式请求
  useEffect(() => {
    if (!isOpen) {
      abortControllerRef.current?.abort();
    }
  }, [isOpen]);

  // 组件卸载时兜底清理
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const updateAssistantMessage = (
    assistantMessageId: string,
    updater: (msg: Message) => Message
  ) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === assistantMessageId ? updater(msg) : msg))
    );
  };

  // 发送消息（流式）
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 生成唯一的消息 ID
    const userMessageId = `msg_${Date.now()}_user`;
    const assistantMessageId = `msg_${Date.now()}_assistant`;

    const userMessage: Message = {
      id: userMessageId,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    shouldAutoScrollRef.current = true;

    // 创建流式消息占位符
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      mode: "rag",
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await fetch("/api/ai/rag/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          question: userMessage.content,
        }),
      });

      if (!response.ok) {
        throw new Error("流式查询失败");
      }

      // 读取流式响应（SSE 格式）
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("无法读取响应流");
      }

      let buffer = "";
      let pendingChunkText = "";
      let scheduledFrame: number | null = null;
      let forceFlushTimer: ReturnType<typeof setTimeout> | null = null;
      let streamError: Error | null = null;

      const flushPendingChunk = () => {
        if (!pendingChunkText) return;
        const textToAppend = pendingChunkText;
        pendingChunkText = "";

        updateAssistantMessage(assistantMessageId, (msg) => ({
          ...msg,
          content: msg.content + textToAppend,
        }));
      };

      const clearFlushSchedulers = () => {
        if (scheduledFrame !== null) {
          cancelAnimationFrame(scheduledFrame);
          scheduledFrame = null;
        }
        if (forceFlushTimer) {
          clearTimeout(forceFlushTimer);
          forceFlushTimer = null;
        }
      };

      const scheduleFlush = () => {
        if (scheduledFrame !== null) return;

        scheduledFrame = requestAnimationFrame(() => {
          scheduledFrame = null;
          flushPendingChunk();
          if (forceFlushTimer) {
            clearTimeout(forceFlushTimer);
            forceFlushTimer = null;
          }
        });

        forceFlushTimer = setTimeout(() => {
          if (scheduledFrame !== null) {
            cancelAnimationFrame(scheduledFrame);
            scheduledFrame = null;
          }
          flushPendingChunk();
          forceFlushTimer = null;
        }, 100);
      };

      const processSSEBlock = (block: string) => {
        if (!block.trim()) return;

        let eventType = "";
        const dataLines: string[] = [];

        for (const line of block.split("\n")) {
          if (line.startsWith("event:")) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trimStart());
          }
        }

        if (dataLines.length === 0) return;

        let data: any;
        try {
          data = JSON.parse(dataLines.join("\n"));
        } catch (e) {
          console.warn("解析 SSE 数据失败:", e, dataLines.join("\n"));
          return;
        }

        if (eventType === "sources" && data.sources) {
          updateAssistantMessage(assistantMessageId, (msg) => ({
            ...msg,
            sources: data.sources,
          }));
          return;
        }

        if (eventType === "chunk" && data.chunk) {
          pendingChunkText += data.chunk;
          scheduleFlush();
          return;
        }

        if (eventType === "complete") {
          if (data.mode) {
            updateAssistantMessage(assistantMessageId, (msg) => ({
              ...msg,
              mode: data.mode,
            }));
          }
          return;
        }

        if (eventType === "error") {
          streamError = new Error(
            typeof data.error === "string" ? data.error : "查询失败"
          );
        }
      };

      try {
        while (!streamError) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE 格式：event: type\ndata: json\n\n
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() || ""; // 保留最后一个不完整的块

          for (const chunk of chunks) {
            processSSEBlock(chunk);
            if (streamError) break;
          }
        }
      } finally {
        clearFlushSchedulers();
        flushPendingChunk();
      }

      // 读取结束后刷新解码器尾部缓冲
      buffer += decoder.decode();
      if (buffer.trim()) {
        processSSEBlock(buffer);
      }

      clearFlushSchedulers();
      flushPendingChunk();

      if (streamError) {
        throw streamError;
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        updateAssistantMessage(assistantMessageId, (msg) => ({
          ...msg,
          content: msg.content || "已停止生成",
        }));
      } else {
        console.error("RAG 流式查询失败:", error);

        updateAssistantMessage(assistantMessageId, (msg) => ({
          ...msg,
          content:
            error instanceof Error
              ? `抱歉，查询失败：${error.message}`
              : "抱歉，查询失败，请稍后重试。",
        }));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // 处理回车发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 清空对话
  const handleClear = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // 索引所有文章
  const handleIndexAll = async () => {
    setIsIndexing(true);
    try {
      const response = await fetch("/api/ai/rag/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true, force: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "索引失败");
      }

      const data = await response.json();
      setIndexStatus({
        indexed: data.indexed || 0,
        total: (data.indexed || 0) + (data.skipped || 0) + (data.failed || 0),
        lastIndexed: new Date().toLocaleString("zh-CN"),
      });

      // 添加系统消息
      let content =
        data.failed === 0
          ? `✅ 索引构建完成！共索引 ${data.indexed} 篇文章，跳过 ${data.skipped} 篇。现在可以开始提问了！`
          : `⚠️ 索引部分完成：成功 ${data.indexed} 篇，跳过 ${data.skipped} 篇，失败 ${data.failed} 篇。`;

      if (data.errors && data.errors.length > 0) {
        content += `\n\n失败原因：\n${data.errors.slice(0, 3).join("\n")}`;
        if (data.errors.length > 3) {
          content += `\n... 还有 ${data.errors.length - 3} 个错误`;
        }
      }

      const systemMessage: Message = {
        id: `msg_${Date.now()}_index_${Math.random().toString(36).substring(7)}`,
        role: "assistant",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, systemMessage]);
    } catch (error) {
      console.error("索引失败:", error);
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error_${Math.random().toString(36).substring(7)}`,
        role: "assistant",
        content: `❌ 索引构建失败：${error instanceof Error ? error.message : "未知错误"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsIndexing(false);
    }
  };

  // 默认触发器
  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <MessageSquare className="h-4 w-4" />
      知识问答
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0 gap-0">
        {/* 头部 - 不使用 DialogHeader 避免双重渲染 */}
        <div className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between mb-2 pr-8">
            {/* 左侧标题 */}
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <DialogTitle className="text-lg font-semibold">
                知识库问答
              </DialogTitle>
            </div>

            {/* 右侧按钮组 - 添加间距避免与关闭按钮重叠 */}
            <div className="flex items-center gap-2">
              {/* 清空按钮 */}
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="h-8 px-2 text-muted-foreground"
                  title="清空对话"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">清空</span>
                </Button>
              )}

              {/* 索引按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleIndexAll}
                disabled={isIndexing}
                className="h-8 px-2 text-muted-foreground"
                title="构建知识库索引"
              >
                {isIndexing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Database className="h-4 w-4 mr-1" />
                )}
                <span className="hidden sm:inline">
                  {isIndexing ? "索引中..." : "构建索引"}
                </span>
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pl-7">
            基于博客文章内容的智能问答。首次使用请先点击「构建索引」
          </p>
        </div>

        {/* 消息列表 */}
        <div
          ref={messagesContainerRef}
          onScroll={handleMessagesScroll}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Bot className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-muted-foreground mb-2">
                有什么想了解的？
              </h3>
              <p className="text-sm text-muted-foreground/70 max-w-sm">
                试试问我关于博客文章的问题，例如：
              </p>
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {/* TODO:这里暂时写死的，后续待优化 */}
                {[
                  "React 有什么特点？",
                  "如何使用 TypeScript？",
                  "Next.js 是什么？",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="px-3 py-1.5 text-xs bg-muted rounded-full hover:bg-muted/80 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2"
                      : "space-y-2"
                  }`}
                >
                  {message.role === "user" ? (
                    <p className="text-sm">{message.content}</p>
                  ) : (
                    <>
                      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                        {message.content === "" && isLoading ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>正在思考...</span>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </p>
                        )}
                        {message.mode === "fallback" && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                            <span>⚠️</span>
                            <span>基础模式（未连接向量数据库）</span>
                          </p>
                        )}
                      </div>

                      {/* 引用来源 */}
                      {message.sources &&
                        message.sources.length > 0 &&
                        message.mode !== "fallback" && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground px-1">
                              参考来源：
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {message.sources
                                .slice(0, 3)
                                .map((source, idx) => (
                                  <a
                                    key={idx}
                                    href={`/posts/${source.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-background border rounded hover:bg-accent transition-colors"
                                  >
                                    <FileText className="h-3 w-3" />
                                    <span className="max-w-[150px] truncate">
                                      {source.title}
                                    </span>
                                  </a>
                                ))}
                            </div>
                          </div>
                        )}
                    </>
                  )}
                </div>

                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))
          )}

          {/* 加载状态 - 不再单独显示,使用空消息代替 */}
          {/* {isLoading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>正在思考...</span>
                </div>
              </div>
            </div>
          )} */}

          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div className="border-t px-4 py-3 flex-shrink-0">
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的问题..."
              rows={1}
              className="resize-none min-h-[40px] max-h-[120px]"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-10 w-10 flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            按 Enter 发送，Shift + Enter 换行
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
