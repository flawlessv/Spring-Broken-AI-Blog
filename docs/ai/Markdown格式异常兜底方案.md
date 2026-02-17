# AI 输出格式异常兜底方案（聚焦 Markdown）

## 1. 背景与目标

在流式对话场景里，模型输出不是一次性完整返回，而是按 `chunk` 逐段到达。  
这会带来两个现实问题：

1. 传输层问题：SSE 帧可能不完整、分段边界不整齐、`data` 可能不是合法 JSON。
2. 展示层问题：模型生成的 Markdown 可能结构不完整，甚至混入不期望的 HTML。

我们要做的不是“保证模型永远输出完美格式”（做不到），而是保证：

1. 页面不崩。
2. 用户始终能看到内容（最差降级为纯文本）。
3. 错误可观测，可继续优化。

---

## 2. 当前项目已实现的兜底链路（从上到下）

## 2.1 Prompt 约束层（源头收敛）

文件：`src/lib/ai/companion.ts:201`

系统提示词里已经加了规则：

1. 要求回答使用简洁 Markdown。
2. 明确“不输出 HTML 标签”。

这一步的作用是“降低脏格式概率”，不是绝对保证。模型依然可能偶发输出异常格式，所以后面必须有技术兜底。

---

## 2.2 SSE 协议解析层（传输容错）

文件：`src/components/chat/anime-assistant-chat.tsx:148`

`parseSSEBlock` 做了几件关键事情：

1. 把 `\r\n` 归一化成 `\n`，减少换行差异导致的解析问题。
2. 逐行提取 `event:` 和 `data:`。
3. 多个 `data:` 行合并后再 `JSON.parse`。
4. 如果 JSON 解析失败，不抛异常，而是返回 `{ message: rawData }`。

这意味着即便服务端某帧 `data` 不是合法 JSON，前端也不会直接挂掉，仍然能拿到可展示文本。

文件：`src/components/chat/anime-assistant-chat.tsx:188`

`consumeSSE` 又补了一层分帧容错：

1. 通过 `ReadableStream + TextDecoder` 按块读取。
2. 用 `\n\n` 做帧分隔，支持“单帧被拆成多次 read”。
3. 处理最后尾包（没有 `\n\n` 结尾时也尝试解析）。

这解决了“网络分块和 SSE 帧边界不一致”的常见问题。

---

## 2.3 消息组装层（事件容错）

文件：`src/components/chat/anime-assistant-chat.tsx:570`

`sendMessage` 对流式事件做了分支处理：

1. `chunk`：增量拼接助手消息。
2. `done`：如果前面 chunk 没拼满，用 `done.content` 做最终兜底。
3. `error`：统一抛错进入 catch，替换为用户可读的错误文案。

这一步的核心是“事件不完整时仍可收敛到可展示结果”，而不是卡在半状态。

---

## 2.4 Markdown 渲染层（最终降级）

文件：`src/components/chat/anime-assistant-chat.tsx:231`

`MarkdownErrorBoundary` 的行为是：

1. 子树渲染抛错时设置 `hasError = true`。
2. 进入降级分支后，直接按纯文本渲染原始内容（`whitespace-pre-wrap`）。
3. 内容更新后重置错误状态，允许下次恢复 Markdown 渲染。

文件：`src/components/chat/anime-assistant-chat.tsx:264`

`AssistantMarkdown` 里用了 `ReactMarkdown + remarkGfm`，并且没有启用 `rehypeRaw`。  
这代表原始 HTML 不会被当作 DOM 执行，安全和稳定性更高。

---

## 2.5 服务端流式层（错误可回传）

文件：`src/app/api/ai/companion/chat/stream/route.ts:112`

服务端统一用 `formatSSEEvent` 输出标准帧，事件有：

1. `start`
2. `context`
3. `chunk`
4. `done`
5. `error`

文件：`src/app/api/ai/companion/chat/stream/route.ts:278`

捕获到服务端异常会发送 `error` 事件，而不是直接断流；前端会把它转成友好提示。  
同时响应头设置了 `X-Accel-Buffering: no`（`src/app/api/ai/companion/chat/stream/route.ts:301`），避免代理缓冲导致“看起来不流式”。

---

## 3. 现在这套方案到底做到了什么

一句话总结：**我们做的是“容错显示”而不是“强修复语法”。**

当前能力：

1. 格式异常时尽量不中断会话。
2. Markdown 渲染异常时可降级纯文本。
3. SSE 异常帧不至于拖垮整个聊天面板。

当前边界：

1. 没有自动修复坏 Markdown（例如补全缺失闭合标签/代码围栏）。
2. 没有对 Markdown 做 AST 级质量评分。
3. 没有把“降级发生率”打成指标看板。

---

## 4. 典型异常案例与当前表现

## 4.1 案例 A：HTML 标签不闭合

输入示例：

```md
这是一个标题
<b>123
下一行内容
```

当前表现：

1. `ReactMarkdown` 默认不会执行原始 HTML。
2. 即使出现渲染异常，`MarkdownErrorBoundary` 会降级纯文本显示。
3. 用户至少能读到完整文本，不会白屏。

## 4.2 案例 B：代码块围栏未闭合

输入示例：

````md
```ts
const a = 1;
```
````

当前表现：

1. 大多数情况下解析器会按普通文本或未闭合 code block 容忍渲染。
2. 若触发异常，仍由 ErrorBoundary 降级纯文本。

## 4.3 案例 C：SSE `data` 不是 JSON

示例：

```text
event: chunk
data: hello-not-json
```

当前表现：

1. `parseSSEBlock` 捕获 `JSON.parse` 异常。
2. 把原始字符串塞进 `{ message: rawData }`，继续流程。
3. 不会因为单帧格式问题导致整条流崩溃。

---

## 5. 面试可讲的“分层兜底模型”（推荐话术）

可以用“4 层防线”回答，结构清晰且贴近工程实践。

## 5.1 第一层：Prompt 约束

在系统提示词明确要求输出 Markdown、禁止 HTML，先降低异常概率。

## 5.2 第二层：传输解析容错

SSE 解析按帧处理，支持半包/尾包；`data` JSON 解析失败不崩溃，回落到原始文本。

## 5.3 第三层：渲染安全策略

Markdown 渲染用 `ReactMarkdown`，不启用原始 HTML 渲染能力，降低 XSS 和异常渲染风险。

## 5.4 第四层：UI 降级兜底

渲染报错进入 ErrorBoundary，自动降级纯文本，保证用户可读和会话连续。

---

## 6. “降级为纯文本”是怎么发生的（你可直接回答）

触发条件：

1. `ReactMarkdown` 子树抛出渲染异常。

执行路径：

1. `MarkdownErrorBoundary.getDerivedStateFromError` 把 `hasError` 设为 `true`。
2. `render` 走降级分支，直接 `<p>{content}</p>` 纯文本输出。
3. 后续消息内容变化时，`componentDidUpdate` 重置错误状态，尝试恢复正常 Markdown 渲染。

效果：

1. 这条消息不再依赖 Markdown 解析器。
2. 聊天面板整体不中断。
3. 用户可以继续发送下一轮消息。

---

## 7. 可演进优化（按投入从低到高）

## 7.1 低成本：前端预清洗（推荐先做）

在渲染前做轻量 normalize：

1. 统一换行。
2. 去除明显非法控制字符。
3. 对极端长连续字符做截断保护。

优点：实现快、风险低。  
缺点：只能修复浅层格式问题。

## 7.2 中成本：服务端输出修复器

在服务端 `done` 前对全文做一次格式修复：

1. 尝试补齐未闭合代码围栏。
2. 过滤不允许的 HTML 标签。
3. 必要时输出“修复后版本 + 原文备份”。

优点：前端逻辑更干净。  
缺点：要谨慎，避免“修复器改坏语义”。

## 7.3 中高成本：AST 校验与回退

流程：

1. 先 parse Markdown AST。
2. parse 失败时自动切纯文本。
3. 记录失败原因和样本。

优点：规则可量化。  
缺点：复杂度提升，需要维护规则。

## 7.4 高价值：可观测性建设

建议埋点：

1. `markdown_render_error_count`
2. `markdown_plaintext_fallback_count`
3. `sse_json_parse_error_count`
4. 触发降级时的 messageId、mode、模型名、请求耗时

有了这些指标，才能评估“异常率是否可接受”。

---

## 8. 30 秒 / 2 分钟面试回答模板

## 8.1 30 秒版

我们对大模型格式异常做了分层兜底。先在 prompt 约束输出 Markdown，再在 SSE 解析时容忍非标准帧和 JSON 解析失败；渲染层用 `ReactMarkdown` 且禁用原始 HTML；如果 Markdown 渲染仍报错，ErrorBoundary 会自动降级为纯文本，保证页面不崩和用户可读。

## 8.2 2 分钟版

在流式场景里，格式异常不可避免，所以我们目标是“可用性优先”。  
第一层在系统提示词约束输出风格，降低脏数据概率。  
第二层在 SSE 解析做容错，支持半包、尾包，并把 JSON 解析失败回退为文本。  
第三层渲染时使用 `ReactMarkdown` 且不启用 `rehypeRaw`，避免 HTML 执行。  
第四层加 ErrorBoundary，任何渲染异常都降级纯文本，保证聊天面板不中断。  
如果继续优化，我会加预清洗、AST 校验和降级指标埋点，把兜底从“能抗住”升级到“可量化优化”。

---

## 9. 一句话结论

当前实现已经具备工程上可用的“防崩 + 可读 + 可恢复”能力；下一步重点不是再堆复杂逻辑，而是补“格式修复精度”和“异常率监控”两件事。
