---
title: React Fiber 架构完全解析
slug: react-fiber-architecture
published: true
featured: false
category: 前端
publishedAt: 2025-01-20
readingTime: 15
coverImage: https://pic1.imgdb.cn/item/696f735ab931ecccdc5b5967.jpg
---

React 16 是一个重要的里程碑，它引入了全新的 Fiber 架构，解决了之前版本的性能瓶颈。这篇文章我会详细讲解 React 16 的三层架构设计、Fiber 的工作原理，以及它如何实现可中断的异步更新。

## React 16 的三层架构

React 16 将架构分为三层：

- **Scheduler（调度器）** —— 调度任务优先级，高优任务优先进入 Reconciler
- **Reconciler（协调器）** —— 负责找出变化的组件
- **Renderer（渲染器）** —— 负责将变化的组件渲染到页面上

与 React 15 相比，React 16 多了 Scheduler 来分配优先级。Reconciler 也从 Stack 架构升级为 Fiber 架构，支持异步可中断更新。

## Fiber 架构的核心思想

### 从组件树到链表

Fiber 架构的核心是将原先的组件树转换为一个链表结构。

**React 15 及之前**：组件树以递归方式处理，从根节点递归遍历整个树，一次性完成所有组件的渲染任务。

**React 16 Fiber**：将每个节点（组件或元素）转化为 Fiber 节点，通过链表结构连接起来。Fiber 节点本质上是一个 JavaScript 对象，保存了组件的状态、类型、子节点，以及对父节点、兄弟节点的引用。
![React 16 架构三层](/images/posts/fiber/img1.png)
![Fiber 链表结构](/images/posts/fiber/img2.png)

### 为什么需要链表

链表结构让 React 可以：

1. **暂停遍历**：随时中断当前工作
2. **恢复执行**：基于保存的中间状态继续之前的工作
3. **优先级调度**：高优先级任务可以插队

## Scheduler：调度器

### 时间分片技术

JavaScript 是单线程语言，代码按顺序执行。React 15 在渲染大组件时，需要递归计算所有子组件，当计算时间超过 16ms（一帧的时间）就会产生卡顿。

![单线程阻塞示意图](/images/posts/fiber/img3.png)

解决办法是将耗时长的任务分成很多小任务，按优先级顺序执行：

1. 当计算时间超过 16ms，交给 GUI 绘制
2. 绘制完成后，渲染线程继续执行 JS
3. Scheduler 检查是否有紧急任务，有则执行紧急任务
4. 完成紧急任务后，继续完成剩余任务
5. 再次到 16ms 时，交给 GUI 绘制

如此反复，就能让用户感觉运行流畅。这个技术称为**时间分片**。

![时间分片示意图](/images/posts/fiber/img4.png)

### 为什么不用 requestIdleCallback

浏览器原生的 `requestIdleCallback` 理论上可以实现类似功能，但 React 没有使用，原因如下：

- **浏览器兼容性**：支持度不够
- **触发频率不稳定**：切换 tab 后，之前 tab 注册的回调触发频率会变得很低

React 实现了功能更完备的 `requestIdleCallback` polyfill，这就是 Scheduler。除了在空闲时触发回调外，Scheduler 还提供了多种调度优先级。

### 调度优先级

React 中的优先级从高到低：

| 优先级       | 说明                           | 示例        |
| ------------ | ------------------------------ | ----------- |
| Immediate    | 最高优先级，马上执行且不可中断 | 同步更新    |
| UserBlocking | 用户交互结果，需要及时反馈     | 点击、输入  |
| Normal       | 普通等级，不需要用户立即感知   | 网络请求    |
| Low          | 低优先级，可以延后执行         | 分析统计    |
| Idle         | 最低优先级，可以被无限延迟     | console.log |

总结：Scheduler 包含两大功能——**时间切片**和**优先级调度**。时间切片通过 Fiber 的链表结构实现中断恢复，优先级调度让高优先级任务可以插队执行。

## Reconciler：协调器

### 从递归到可中断循环

**React 15 的 Reconciler**：递归处理虚拟 DOM，同步且不可中断。

**React 16 的 Reconciler**：从递归变成可中断的循环过程，每次循环都会调用 `shouldYield()` 判断当前是否有剩余时间。

```javascript
function workLoopConcurrent() {
  // 直到调度程序要求我们让步之前继续工作
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
}
```

### 协调阶段（Reconciliation Phase）

React 16 中，Reconciler 与 Renderer 不再交替工作。当 Scheduler 将任务交给 Reconciler 后，Reconciler 会为变化的虚拟 DOM 打上增/删/更新的标签。

这个过程称为**协调阶段**，特点如下：

- **可中断**：React 可以暂停它，处理更高优先级的任务，然后再继续
- **在内存中进行**：不会更新页面上的 DOM

具体步骤：

1. **开始任务调度**：Fiber 将更新任务拆分为小的任务片段，按优先级调度
2. **遍历 Fiber 树**：对比新状态与旧状态，生成需要更新的部分
3. **执行 Diff 算法**：决定哪些节点需要更新、添加或删除
4. **任务拆分与时间切片**：每隔一定时间（如 16ms）检查是否有更高优先级的任务

## Renderer：渲染器

Renderer 根据 Reconciler 为虚拟 DOM 打的标记，同步执行对应的 DOM 操作（虚拟 DOM 变视图）。

这个过程称为**提交阶段**，特点是：

- **同步的、不可中断的**
- 直接操作真实 DOM

具体步骤：

1. **更新 DOM**：根据协调阶段生成的更新列表，进行插入、更新或删除操作
2. **调用生命周期方法**：调用 componentDidMount、componentDidUpdate 以及 useEffect
3. **更新完成**：Fiber 树的变更反映在界面上，用户可以看到最新的 UI

## 完整的更新流程

下面通过一个例子来看看 React 16 的完整更新流程：

```jsx
import React from "react";

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { count: 1 };
  }

  onClick() {
    this.setState({ count: this.state.count + 1 });
  }

  render() {
    return (
      <ul>
        <button onClick={() => this.onClick()}>乘以{this.state.count}</button>
        <li>{1 * this.state.count}</li>
        <li>{2 * this.state.count}</li>
        <li>{3 * this.state.count}</li>
      </ul>
    );
  }
}
```

![React 16 更新流程](/images/posts/fiber/img5.png)

图中红框内的步骤（调度器和协调器的工作）随时可能被中断：

- 有其他更高优先级任务需要先更新
- 当前帧没有剩余时间

由于这些工作都在内存中进行，不会更新页面上的 DOM，所以即使反复中断，用户也不会看见更新不完全的 DOM。

## 总结

回顾一下 React 16 Fiber 架构的核心要点：

**三层架构**

- **Scheduler**：时间分片 + 优先级调度
- **Reconciler**：可中断的协调阶段，在内存中标记变化
- **Renderer**：同步不可中断的提交阶段，更新真实 DOM

**核心优势**

- 解决了大组件渲染的卡顿问题
- 支持优先级调度，用户交互优先
- 可中断可恢复，不会阻塞主线程

理解 Fiber 架构有助于我们更好地理解 React 18 的并发特性，以及如何编写高性能的 React 应用。
