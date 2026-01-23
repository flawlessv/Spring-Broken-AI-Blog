---
title: 浅析浏览器与Node.js的事件循环
slug: event-loop-deep-dive
published: false
category: 前端
publishedAt: 2025-09-03
readingTime: 15
tags: [JavaScript]
coverImage: https://pic1.imgdb.cn/item/696c6b3dcc965d6157f6b76d.jpg
---

> 原文作者：暮星
> 来源：https://juejin.cn/post/7326803868326592539

# 事件循环详解：浏览器与 Node.js 的异步机制

> 事件循环是宿主环境处理 JS 异步操作，让其能够非阻塞式运行的机制。不同宿主环境对事件循环的实现方式有所不同，接下来，本文将详细描述 JS 在浏览器和 Node.js 这两个宿主环境中的事件循环机制。

## 单线程的 JavaScript

### 同步与异步

JavaScript 在设计之初主要用于与用户进行**页面交互**和**操纵 DOM**的**浏览器脚本语言**。

> **为什么必须是单线程？** 如果 JavaScript 支持多线程，那么两个线程同时操作同一个 DOM 节点时就会产生冲突。例如，一个线程正在删除某个节点，而另一个线程正在修改该节点的内容，这种并发操作会导致不可预测的结果，使页面状态变得极其复杂且难以调试。因此，为避免由不可预测的用户操作可能带来的复杂的并发问题，JavaScript 只能设计成**单线程**的，这也是这门语言的核心特征之一。

> JS 的宿主环境通过仅提供一个线程运行 JS 来保证 JS 代码的单线程运行。

单线程意味着 JS 引擎在同一时间只能做一件事情，即**同步**地执行代码。但在代码执行过程中不可避免地会遇到一些**无法立即执行**的任务，例如：

- 计时器到达时间后要执行的任务 — `setInterval`、`setTimeout`
- 网络请求完成后要执行的任务 — `XMLHttpRequest`、`Fetch`
- 监听到用户操作后要执行的任务 — `addEventListener`

如果让执行 JS 的线程去处理这些任务，就会导致该线程处于**长期阻塞**的状态。

> **为什么 JS 线程卡住会导致页面无法渲染？** 因为浏览器的渲染线程和 JS 执行线程是**互斥**的——它们不能同时执行。这是为了避免 DOM 操作的竞态问题。如果渲染线程正在绘制 DOM，同时 JS 线程修改了 DOM，会导致渲染出的界面和实际 DOM 状态不一致，出现页面错乱；

而宿主环境中的 JS 执行线程往往还承担着极其重要的工作。例如，在浏览器中，如果执行 JS 的线程长期阻塞，就会导致浏览器卡死！

为避免上述情况发生，JS 的宿主环境使用了**异步**的方式来处理这种无法立即执行的任务。

当遇到异步任务时，宿主环境会将其交给**其他线程**处理，执行 JS 的线程则会立即结束当前任务转而去执行后续代码。

### 事件循环

事件循环是宿主环境处理 JS 异步操作，让其能够**非阻塞式运行**的机制。

不同宿主环境对事件循环的实现方式有所不同，不过在核心机制上大同小异。

接下来，本文将详细描述 JavaScript 在**浏览器**和 **Node.js** 这两个宿主环境中的事件循环机制。

## 浏览器事件循环

### 浅谈浏览器

聊浏览器的事件循环之前，我们先说说浏览器本身。

现代浏览器是一个**多进程多线程**的应用程序，内部工作极其复杂，其程度直逼操作系统。它拥有数个功能模块，为避免单个模块崩溃牵连其他模块，导致连锁反应，使浏览器彻底崩溃。浏览器在启动时，会开启多个进程，把不同的功能模块放在**不同的进程**里。

**浏览器进程架构图示**：

```
┌─────────────────────────────────────┐
│        浏览器主进程                  │
│  - 界面显示、用户交互                │
│  - 进程管理                          │
└──────────────┬──────────────────────┘
               │
      ┌────────┼────────┐
      │        │        │
┌─────▼───┐ ┌─▼────┐ ┌─▼────────┐
│渲染进程 │ │网络进程│ │GPU进程   │
│(标签页) │ │       │ │          │
└─────────┘ └──────┘ └──────────┘
```

浏览器进程众多，其中比较**重要**的有：

#### 浏览器进程

浏览器进程是浏览器的**主进程**，无论打开多少浏览器窗口，它仅有**一个**。

它主要负责浏览器**界面显示**、**用户交互**和**进程管理**。

> 这里说的界面和交互，不是视窗内的网站界面。而是指浏览器本身自带的部分，如导航栏、书签栏、刷新按钮等。

刚打开浏览器的时候只有一个浏览器进程，其他进程都是它创建的。

#### 网络进程

网络进程主要负责处理网站的**数据请求和响应**，通常情况下，它与**渲染进程**的交互最为密切。每当网站需要进行资源请求，渲染进程就会将任务交给网络进程处理，网络进程取得响应结果后再返回给渲染进程。

网络进程内部会开启多个线程，以实现**多网络请求**的**异步化处理**。

#### 渲染进程

渲染进程负责控制和显示**视窗**部分（网站页面）的所有内容，主要是解析 HTML、CSS、JS 和其他资源，并生成渲染树、执行布局和绘制等操作。

在现代浏览器中，默认会为**每个标签页**创建一个渲染进程。

出于安全考虑，渲染进程运行在**沙箱模式**下，无法访问系统资源。

> 通常可以通过浏览器的 _更多工具_ -> _任务管理器_ 查看当前浏览器开启的所有进程及资源消耗情况。

### 浏览器中的 Event Loop

渲染进程启动后，会开启一个**渲染主线程**，它是浏览器中**最繁忙**的线程，需要它处理的任务包括但不限于：

- 解析 HTML、CSS
- 计算样式、布局
- 处理图层、绘制页面
- 执行 JS、执行各种回调函数

**渲染主线程任务图示**：
![渲染主线程任务图](/images/posts/event-loop/img1.png)

> **事件循环的本质**
>
> 事件循环其实就是浏览器渲染主线程的任务调度流程——因为主线程要处理 JS 执行、DOM 操作、页面渲染这些所有核心任务，必须有一套固定规则来保证任务有序执行，这规则就是事件循环。
>
> **具体流程分三步：**
>
> **第一步**：浏览器会给渲染主线程维护一个先进先出的"消息队列"（也叫任务队列），所有要执行的任务（比如初始化的 JS 代码、点击事件的处理函数、定时器回调、网络请求回调），都会按产生顺序排进这个队列，不会乱序。
>
> **第二步**：渲染进程进入渲染流程，渲染主线程便会开启一个**无限循环**，主线程会一直重复一个动作：从消息队列的队首取出任务，然后执行。如果取到的是"同步任务"（比如直接写的 `let a = 1`、普通函数调用），就直接执行完；如果取到的任务里包含"异步操作"（比如 `setTimeout`、`fetch` 请求、`addEventListener` 绑定事件），主线程不会等待，而是把这个异步操作"移交"给浏览器的其他专属线程处理——比如定时器交给"计时器线程"负责计时，网络请求交给"网络线程"负责发送，DOM 事件则等着用户触发，这些线程都是独立于主线程的。
>
> **第三步**：等到这些异步操作完成后的处理。等其他线程把异步操作处理完（比如计时器到点了、网络请求拿到响应了、用户点击了绑定事件的元素），这些线程会把对应的"回调函数"包装成一个新任务，加到消息队列的末尾。这时候，渲染主线程如果正在执行其他任务，就继续执行；如果已经执行完手头任务、甚至处于休眠状态（队列空的时候会休眠），就会被唤醒，继续从队列里取新任务执行。
>
> 整个"取任务 → 执行 → 移交异步 → 补全异步任务 → 再取任务"的循环过程，就是事件循环。简单说，核心就是"主线程按队列顺序执行，异步交给其他线程，完事后回调回队列"，这样所有任务就不会冲突，也不会阻塞。

**事件循环具体过程**：

```
┌─────────────────────────────────────────────────┐
│                   事件循环                        │
│                                                  │
│  ┌──────────────┐        ┌──────────────┐       │
│  │   执行任务    │ ◄─────┤  消息队列     │       │
│  └──────┬───────┘        └──────┬───────┘       │
│         │                        │               │
│         ▼                        │               │
│  ┌──────────────┐               │               │
│  │  异步操作？   │─ 是 ──────────►┤ 其他线程       │
│  └──────┬───────┘               │               │
│         │ 否                     │               │
│         ▼                        │               │
│  ┌──────────────┐               │               │
│  │  继续执行     │               │               │
│  └──────────────┘               │               │
│                                 │               │
│  ┌──────────────┐               │               │
│  │   无任务？    │─ 是 ──────────►┤ 休眠          │
│  └──────────────┘               │               │
│                                  │               │
└──────────────────────────────────┴───────────────┘
```

### 多队列机制

任务在消息队列里先进先出并没有优先级，而浏览器中消息队列**不止一条**，它们是有优先级的。

过去我们把消息队列分为**宏队列**和**微队列**：

- 宏队列排队**宏任务**（DOM 操作回调、定时器回调、UI 绘制等）
- 微队列排队**微任务**（Promise 回调、MutationObserver 等）

渲染主线程的每次循环会**优先**执行并清空微队列任务，再执行宏队列。

不过随着时间推移，浏览器复杂度急剧提升，仅两个队列已经不能满足现代浏览器的需求了。于是，W3C 在制定 [HTML 规范](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)的时候已抛弃宏队列的说法。

各浏览器厂商在实现事件循环的时候会根据最新的解释：_每个任务都有其任务类型，同一个类型的任务必须在同一个队列里排队。在一次事件循环中，浏览器可根据实际情况从不同的队列中取出任务执行。并且浏览器必须准备好一个微队列，其中的任务优先于所有其他队列的任务执行_。

不同浏览器，除微队列外，队列的种类和数量均可能不同，这取决于浏览器厂商。在目前的 Chrome 的实现中，至少包含了下面几个队列：

- **微队列**：用于存放需要最快执行的任务，优先级极高，将任务加入微队列的方式有 `promise.then()`、`MutationObserver`
- **交互队列**：用于存放用户操作后产生的事件处理任务，优先级次于微队列
- **延迟队列**：用于存放定时器到达后的回调任务，优先级次于交互队列

> 需要特别注意的是，人工合成的事件派发，即直接写在代码里的 `dom.click()` 或 `dispatchEvent()`，相对于浏览器而言并不是真正的用户交互，会被当作同步任务执行。
>
> **用户动作触发的事件**指的是用户通过真实的物理操作产生的事件，例如：
>
> - 鼠标操作：点击、双击、移动、悬停等
> - 键盘操作：按下按键、释放按键等
>   这些真实用户交互产生的事件会被浏览器异步处理，加入交互队列等待执行。只有用户动作触发的事件，才会作为异步任务，在事件循环中等待执行。

### 案例分析

下面通过一个具体案例，说明浏览器事件循环的过程：

```javascript
// 写出下述程序的输出结果
const btn = document.getElementById("button");

function test() {
  console.log("function test!");
  Promise.resolve().then(() => {
    console.log("promise1");
  });
}

setTimeout(() => {
  console.log("set timer");
  Promise.resolve().then(test);
}, 0);

btn.onclick = () => {
  console.log("click button");
};

btn.click();

Promise.resolve().then(() => {
  console.log("promise2");
});

console.log("script start");

// 输出结果依次为：
// click button
// script start
// promise2
// set timer
// function test!
// promise1
```

**结果分析**：

1. 执行全局代码，到达 `setTimeout` 交给计时器线程处理，由于等待 0 ms 故立刻加入延迟队列。
2. 到达 `btn.click()`，由于是人工合成的点击事件，直接当同步任务执行，输出 `click button`。
3. 到达 `Promise.resolve().then()`，交给其他线程处理，立即完成并加入微队列。
4. 输出 `script start`，至此同步任务完成。
5. 事件循环开始，根据队列优先级，首先渲染主线程拿取并清空微队列任务，输出 `promise2`。
6. 渲染主线程拿取并清空延迟队列任务，输出 `set timer`，遇到第二个 `Promise.resolve().then()`，加入微队列。
7. 执行 `test` 函数，输出 `function test!`，遇到第三个 `Promise.resolve().then()`，加入微队列。
8. 清空微队列，输出 `promise1`。

## Node.js 事件循环

### Libuv

在 JavaScript 的所有宿主环境中，无论是浏览器还是 Node.js，事件循环机制都不是 **ECMAScript** 的语言规范定义的。浏览器中的事件循环是根据 **HTML 标准**实现的，而 Node.js 中的事件循环则是基于 `libuv` 实现的。

`libuv` 是一个用 C 语言实现的高性能解决单线程非阻塞异步 I/O 的开源库，本质上它是对常见**操作系统底层异步 I/O 操作**的封装。在 nodejs 底层，Node API 的实现其实就是调用的它。

我们知道浏览器事件循环中执行异步任务的其他线程是由浏览器本身提供的，多线程调度是由渲染主线程完成的。而在 nodejs 中，这都是 `libuv` 完成的。

几乎每个 Node API 都有**异步执行版本**，`libuv` 直接负责它们的执行，`libuv` 会开启一个线程池，主线程执行到异步操作后，`libuv` 就会在**线程池**中调度空闲线程去执行，可以说 `libuv` 为 nodejs 提供了整个事件循环功能。
![Node.js 事件循环阶段图示](/images/posts/event-loop/img2.png)

### Node.js 中的 Event Loop

与在浏览器中一样，在 nodejs 中 JS 最开始在**主线程**上执行，执行同步任务、发出异步请求、规划定时器生效时间、执行 process.nextTick 等，这时事件循环还没开始。

在上述过程中，如果没有异步操作，代码在执行完成后便**直接退出**。如果有，`libuv` 会把不同的异步任务分配给**不同的线程**，形成事件循环。在同步代码执行完后，nodejs 便会进入事件循环，依次执行不同队列中的任务。libuv 会以异步的方式将任务的执行结果返回给 V8 引擎，V8 引擎再返回给用户。

**Node.js 事件循环阶段图示**：
![Node.js 事件循环阶段图示](/images/posts/event-loop/img3.png)

Nodejs 事件循环中的消息队列共有 **8** 个，若引用之前宏队列、微队列的说法，具体可划分为：

**宏队列**：

- `timers`（重要）- 定时器队列
- `pending callbacks` - 上次事件循环延迟的 I/O 回调
- `idle, prepare` - 仅供 nodejs 内部使用
- `poll`（重要）- 轮询队列
- `check`（重要）- 检查队列
- `close callbacks` - 执行 close 事件的回调函数

**微队列**：

- `nextTick` - process.nextTick 回调
- `Promise` - Promise.then 回调

我们先来说说宏队列中比较重要的 3 个：

#### timers

`timers`，也就是**计时器队列**，负责处理 `setTimeout` 和 `setInterval` 定义的回调函数。

值得注意的是，不管在浏览器中还是 nodejs 中，所有的定时器回调函数都**不能保证**到达时间后立即执行。一是因为从计算机硬件和底层操作系统来看，计时器的实现本身就是不精准的，二是因为 `poll` 阶段对 `timers` 阶段的深刻影响。

#### poll

`poll` 称为**轮询队列**，该阶段会处理除 `timers` 和 `check` 队列外的绝大多数 I/O 回调任务，如文件读取、监听用户请求等。

事件循环到达该阶段时，它的运行方式为：

- 如果 `poll` 队列中有回调任务，则依次执行回调直到清空队列。
- 如果 `poll` 队列中没有回调任务
  - 若其他队列中后续可能会出现回调任务，则一直等待
  - 若等待时间超过预设的时间限制，也会自动进入下一次事件循环
  - 若其他队列中后续不可能再出现回调任务了，则立即结束该阶段，并在本轮事件循环完成后，退出 node 程序

#### check

`check` 称为**检查队列**，负责处理 `setImmediate` 定义的回调函数。

`setTimeout` 和 `setImmediate` 的不同之处在于，每次执行到 `timers` 队列时，定时器观察者内部会去**检查**代码中的定时器是否超过定时时间，而 `setImmediate` 则是**直接**将回调任务**加入**到 `check` 队列。

**案例分析 1：不精准的计时器**

```javascript
const fs = require("fs");
const start = Date.now();

setTimeout(() => {
  console.log("setTimeout exec", Date.now() - start);
}, 200);

fs.readFile("./index.js", "utf-8", (err, data) => {
  console.log("file read");
  const start = Date.now();
  while (Date.now() - start < 300) {}
});

// 输出结果：
// file read
// setTimeout exec 313ms
```

**分析**：

1. 进入事件循环后，定时器还没到时间，`timers` 队列空，来到 `poll` 阶段
2. 读取文件需要一定时间，`poll` 队列空，等待
3. 文件读取完成，回调函数加入 `poll` 队列，执行输出 `file read`，开启循环，阻塞 300ms
4. 定时器到时间，回调函数加入 `timers` 队列，由于 `poll` 阶段未结束，被阻塞，等待
5. `poll` 中的循环结束，检测到 `timers` 中有任务，结束 `poll` 阶段，开始下一次事件循环
6. 执行 `timers` 中的回调函数，输出 `setTimeout exec 313ms`

### 微任务队列

对于微队列的 `nextTick` 和 `Promise`，严格意义上讲也不属于事件循环。在事件循环中，每次打算进入下个阶段之前，必须要先依次反复清空 `nextTick` 和 `promise` 队列，直到两个队列完全没有即将要到来的任务的时候再进入下个阶段。

我们可以通过 `process.nextTick()` 将回调函数加入 `nextTick` 队列，和通过 `Promise.resolve().then()` 将回调函数加入 `Promise` 队列，且 `nextTick` 队列的优先级还要**高于** `Promise` 队列，所以 `process.nextTick` 是 nodejs 中执行**最快**的异步操作。

**案例分析 2：综合案例**

```javascript
async function async1() {
  console.log("async1 start");
  await async2();
  console.log("async1 end");
}

async function async2() {
  console.log("async2");
}

console.log("script start");

setTimeout(function () {
  console.log("setTimeout0");
}, 0);

setTimeout(function () {
  console.log("setTimeout3");
}, 3);

setImmediate(() => console.log("setImmediate"));

process.nextTick(() => console.log("nextTick"));

async1();

new Promise(function (resolve) {
  console.log("promise1");
  resolve();
  console.log("promise2");
}).then(function () {
  console.log("promise3");
});

console.log("script end");

// 输出结果依次为：
// script start
// async1 start
// async2
// promise1
// promise2
// script end
// nextTick
// async1 end
// promise3
// 剩下的 setTimeout0、setTimeout3、setImmediate 顺序不定
// 唯一能确定的是 setTimeout0 在 setTimeout3 前输出
// 而 setImmediate 可能在 setTimeout0 前，也可能在 setTimeout3 之后
```

**分析**：

1. 执行全局代码，输出 `script start`。
2. 到达 `setTimeout(0)` 和 `setTimeout(3)`，交给计时器线程开始计时。
3. 到达 `setImmediate`，立刻将任务加入 `check` 队列。
4. 到达 `process.nextTick`，立刻将任务加入 `nextTick` 队列。
5. 执行 `async1`，输出 `async1 start`。`await async2()` 立刻执行 `async2()`，输出 `async2`，将后续任务包装成 `Promise.then()` 加入 `Promise` 队列。
6. 执行 `new Promise()`，输出 `promise1`、`promise2`，然后将 `.then()` 里的任务扔进 `Promise` 队列。
7. 执行最后的 `console.log`，输出 `script end`。
8. 至此同步代码全部执行完毕，进入事件循环。

**此时各消息队列的状态**：

- 已输出：`script start`、`async1 start`、`async2`、`promise1`、`promise2`、`script end`
- `nextTick` 队列：`console.log("nextTick")`
- `Promise` 队列：`console.log("async1 end")`、`console.log("promise3")`
- `timers` 队列：`console.log("setTimeout0")`、`console.log("setTimeout3")`
- `check` 队列：`console.log("setImmediate")`

9. 在进入 `timers` 阶段前先清空微队列，先执行 `nextTick` 队列，输出 `nextTick`。
10. 执行 `Promise` 队列，依次输出 `async1 end`、`promise3`。
11. 进入 `timers` 阶段，由于不确定计时器线程是否已完成计时，故无法预测它们与 `check` 队列中的 `setImmediate` 谁先输出。

## 总结

### 浏览器 vs Node.js 事件循环对比

| 特性     | 浏览器                         | Node.js                                 |
| -------- | ------------------------------ | --------------------------------------- |
| 实现基础 | HTML 标准                      | libuv 库                                |
| 微任务   | Promise.then、MutationObserver | process.nextTick、Promise.then          |
| 宏任务   | 定时器、事件回调、UI 渲染      | timers、poll、check、close callbacks 等 |
| 执行顺序 | 微任务 → 渲染 → 宏任务         | 微任务 → 各阶段循环                     |

### 核心要点

1. **JavaScript 是单线程的**，但通过事件循环实现异步非阻塞
2. **微任务优先级高于宏任务**，会优先执行
3. **Node.js 的事件循环分为多个阶段**，每个阶段都有特定的任务队列
4. **`process.nextTick` 优先级高于 `Promise.then`**
5. **定时器不精准**，受事件循环其他阶段影响

---

**参考资料**：

- [HTML 规范 - 事件循环](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)
- [Node.js 官方文档 - 事件循环](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/)
- [libuv 官方文档](https://docs.libuv.org/)
