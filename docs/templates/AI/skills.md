---
title: 小白也能解锁 Claude Code 的秘密武器：Skills
description: Claude Code 的 Skills 功能让你能够把专业知识、工作流程和最佳实践打包成"能力单元"，让 AI 主动学习并配合你的能力和偏好。
slug: claude-code-skills-guide
published: true
category: ai
publishedAt: 2026-01-17
readingTime: 10
coverImage: https://pic1.imgdb.cn/item/696c6c3dcc965d6157f6ba56.jpg
---

> 原文作者：Yuker
> 来源：https://x.com/0xyuker/status/2008156911611633896?s=12

# 小白也能解锁 Claude Code 的秘密武器：Skills

两个月以来，我一直在思考一个问题：该如何提升 AI 的能力呢？

哪怕有了 Memory，可以让他记住了我是谁，我喜欢什么；但我该如何让他学习到我的"能力"呢？

这东西彻底改变了我对 AI 协作的看法。它不再是简单的"你问我答"，而是让 AI 主动学习、来配合你的能力和偏好。

这感觉就像，你不是在跟一个什么都懂的实习生说话，而是在跟一个资深团队成员协作。

## 什么是 Skills？

Claude Code 虽然名字里带个 Code，但它绝不仅仅是写代码的工具。它是一个真正的通用 Agent，能帮你处理电脑上各种繁琐的工作。而 **Skill，就是它能力无限扩展的"插件包"**。

简单来说，**Skill 是一个"能力单元"**，它把专业知识、工作流程和最佳实践打包起来，让 Claude Code 能够自动调用。

最关键的区别在于：你不需要像用斜杠命令（/command）那样手动触发它。**CC 会根据对话上下文，自己判断什么时候该用哪个 Skill**。

它就像一个有经验的同事，看到你在处理某个特定任务，会主动过来说："这个我熟，我来帮你。"

### Skills 的作用范围

Skills 可以根据你的需要，存储在不同位置，作用范围也不同：

- **对于个人**：你可以把你最常用的代码片段、写作风格、数据分析流程，封装成个人 Skill。从此，Claude Code 就是最懂你的那个助手。

- **对于团队**：团队的设计规范、API 使用指南、项目提交流程……这些都可以做成项目 Skill，放在代码仓库里共享。新成员加入，CC 自动就能带他上路，再也不需要一遍遍地人肉培训。

> 💡 **团队协作首选项目 Skills**，因为它们可以被检入 git，团队成员拉下代码就能自动获得新能力。

## 30 秒上手 Skill 创建

### 第一步：创建你的 Skill 目录

```bash
# 创建个人 Skill，只有你能用
mkdir -p ~/.claude/skills/my-skill

# 或者，创建项目 Skill，团队可以共享
mkdir -p .claude/skills/my-company-skill
```

### 第二步：编写 SKILL.md 文件

Skill 的核心，由两部分组成：**YAML frontmatter（元数据）** 和 **Markdown（指令）**。

```yaml
---
name: your-skill-name
description: 简要描述这个 Skill 做什么以及何时使用它
---

# 你的 Skill 名称

## 指令
为 Claude 提供清晰的分步指导。

## 示例
展示使用这个 Skill 的具体示例。
```

### 命名规范

- `name` 字段推荐使用**英文**，且**动名词形式**（动词 + -ing），让能力一目了然。

  ✅ 推荐：`processing-pdfs`, `analyzing-spreadsheets`, `writing-documentation`

  ❌ 避免：`helper`, `utils`, `documents`（过于模糊）

- `description` 字段是 Claude Code 能否"智能"激活你的 Skill 的关键。它必须用**第三人称**清晰地描述"它能做什么"以及"什么时候用它"。

#### 好的描述示例

```yaml
---
name: Feynman-Simplifier-Skill
description: 将任何复杂的科学、技术或哲学概念，转化为 5 岁孩童都能听懂的类比，并精准定位用户的知识盲区。
---
```

#### 不好的描述示例

```yaml
---
name: 解释器
description: 这是一个用来解释东西的工具，可以把难懂的变简单。
---
```

**描述越精确，包含的触发关键词越多**（如 git diff, commit message），Claude Code 就越"懂你"。

### 第三步：目录架构（⚠️ 最容易出错的地方）

```
~/.claude/
└── skills/
    └── my-skill/           ← 所有 SKILL.md 都需要放在文件夹中
        └── SKILL.md        ← 这就是你的 skill 文档
```

这时候，当你再去 Claude Code 里面输入 `/skills` 指令，就能够清晰地看到你的目录中有哪些 skill 是存在的。对，就这么简单！

### 让 Claude Code 自己写 Skill

你甚至可以让 Claude Code 自己给你写一个 skill：

```markdown
请给我生成一个优秀且完整的 SKILL.md，功能是：

- 【描述你要的功能】

要求：

1. 需要含有规范的 YAML frontmatter
2. name 使用动名词形式
3. description 使用第三人称，包含触发术语
4. 添加 Instructions 和 Examples 章节
```

## 一个真实的用法：40 秒，把 1000 条用户吐槽变成产品洞察

做产品的最怕版本发布后的前三天。App Store 评论、客服后台的工单、社群里的吐槽像雪片一样飞来。以前我们得安排两个实习生，花一整天把这些反馈复制到 Excel 里，一条条打标签，最后统计出"这周大家到底在骂什么"，效率低且容易漏掉关键问题。

于是，我们创建了一个叫 `feedback-analyst` 的项目 Skill：

```yaml
---
name: feedback-analyst
description: 读取用户反馈或评论列表，进行情感分析，自动将其归类为"功能缺陷"、"体验优化"或"新需求"，并提取出现频率最高的 Top 5 痛点。当用户提供原始反馈数据并请求分析时使用。
---
```

现在，每当运营导出一份乱七八糟的反馈 CSV 文件，只需要对 Claude Code 说一句："帮我看看这周用户的差评主要集中在哪"，CC 就会自动激活这个 Skill，瞬间读完几千字的内容，忽略掉无意义的情绪宣泄，直接告诉你：

> "60% 的差评是因为新上线的'深色模式'导致文字看不清，建议优先修复。"

整个过程立竿见影，从前需要人肉分类一整天的工作，现在喝口水的时间就有了结论，决策有了真实的数据支撑。

这只是冰山一角，你可以用它来：

- 分析竞品在 App Store 的差评（寻找机会点）
- 整理原本枯燥的用户访谈逐字稿
- 从几十页的行业报告中提炼出关键趋势

最重要的是，**Skill 能把每个人的能力给抽象化成为一种模块组件**；让这个组件可以在团队内部，甚至于外部进行流通。

## 结语：巨鲸潜行，万物生长

如果说之前的 AI 是一个无所不知的"巨鲸"，那 Skill 机制则让整个生态"万物生长"。

它把定义"能力"的权力，从 AI 公司交还给了每一位用户、每一个团队。我们不再只是被动的使用者，而是主动的"训练师"和"赋能者"。

我们正在见证一个新时代的开启：AI 将不再是一个个孤立的"大脑"，而是能够深度融入我们工作流、理解我们独特上下文的"超级伙伴"。

如果你也想体验电脑上最智能的 AI，感受这种"人机合一"的默契，一定要试试 Claude Code 和它的 Skill 功能。

万事开头难，但这篇文章已经为你铺平了最开始的道路。当你遇到任何重复性的、繁琐的工作时，不妨打开 Claude Code，跟它聊聊，或者干脆为它创建一个 Skill。

相信我，你很快会找到属于自己的"Aha Moment"！

## 附录：一个 Skill 框架示例

````yaml
---
name: convert-to-word
description: 把 PDF 转换成为 Word
---

# Convert PDF to Word

This skill converts PDF documents to editable Word (.docx) format.

## Usage

When the user requests to convert a PDF to Word format:

1. Install required dependencies if not already installed:

```bash
pip install pdf2docx python-docx PyPDF2
````

2. Use the following Python code to perform the conversion:

```python
from pdf2docx import Converter
from pathlib import Path

def convert_pdf_to_word(pdf_path, output_path=None):
    """Convert a PDF file to Word (.docx) format."""
    pdf_file = Path(pdf_path)

    if not pdf_file.exists():
        raise FileNotFoundError(f"PDF file not found: {pdf_file}")

    if output_path is None:
        output_path = pdf_file.with_suffix('.docx')
    else:
        output_path = Path(output_path)

    print(f"Converting {pdf_file.name}...")

    converter = Converter(str(pdf_file))
    converter.convert(str(output_path))
    converter.close()

    if output_path.exists():
        file_size = output_path.stat().st_size / 1024
        print(f"✓ Conversion successful!")
        print(f"  Output: {output_path}")
        print(f"  Size: {file_size:.2f} KB")
        return str(output_path)
    else:
        raise RuntimeError("Conversion failed")

# Example usage:
# convert_pdf_to_word("document.pdf")
# convert_pdf_to_word("report.pdf", "output/report.docx")
```

## Features

- Preserves text formatting
- Retains images and graphics
- Maintains table structures
- Supports multi-page documents
- Simple error handling

## Limitations

- Complex layouts may not convert perfectly
- Scanned PDFs require OCR preprocessing
- Password-protected PDFs need to be unlocked first

```

---

**参考资料**：

- [Claude Code 官方文档](https://code.anthropic.com/docs)
- [Yuker on X](https://x.com/0xyuker)
```
