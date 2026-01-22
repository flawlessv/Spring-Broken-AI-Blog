---
title: React Diff 算法完全指南
slug: react-diff-algorithm
published: true
featured: false
category: 前端
publishedAt: 2025-01-20
readingTime: 20
coverImage: https://pic1.imgdb.cn/item/696f735ab931ecccdc5b5968.jpg
---

### 前置知识：虚拟 DOM 与 Fiber 架构

#### 什么是虚拟 DOM？

**虚拟 DOM（Virtual DOM）** 是一个用来描述真实 DOM UI 的结构和属性的轻量级 JavaScript 对象

```javascript
// 真实 DOM（浏览器中的实际节点）
<div class="container">Hello</div>

// 对应的虚拟 DOM（内存中的 JS 对象）
{
  type: 'div',           // 标签类型
  props: {               // 节点属性
    className: 'container',
    children: ['Hello']
  }
}
```

**虚拟 DOM 的核心作用**：在内存中进行 diff 对比，找出最小变化，然后批量更新真实 DOM，减少昂贵的 DOM 操作（因为直接操作真实 DOM 很慢）。

#### 虚拟 DOM 为何能提升性能？

直接操作真实 DOM 的成本很高，主要原因如下：

**1. 布局（Layout / Reflow）和绘制（Paint / Repaint）**

- 修改 DOM 元素的几何属性（宽度、高度、位置等）会触发**重排**，浏览器需要重新计算所有受影响元素的几何位置
- 修改外观属性（颜色、背景等）会触发**重绘**，浏览器需要重新绘制受影响的区域

如果在一个循环中进行多次 DOM 操作，浏览器会不断地 **重排 → 重绘 → 重排 → 重绘**，导致明显的性能瓶颈。

**虚拟 DOM 的解决方案**：

虚拟 DOM 通过**三个步骤**减少昂贵的 DOM 操作：

1. **生成新的虚拟 DOM 树**：状态变化时，React 不会立即操作真实 DOM，而是重新执行 `render` 方法生成新的虚拟 DOM 树
2. **Diff 算法批量比较**：将新旧虚拟 DOM 树进行高效比较（O(n) 时间复杂度），找出最小差异，生成"变更列表"
3. **一次性更新真实 DOM**：将变更列表批量应用到真实 DOM，极大减少重排和重绘次数

**性能优势总结**：

- ✅ **批量更新**：将最耗性能的重排重排减少几倍不止
- ✅ **最小变更**：Diff 算法找出最小变更列表，最大限度减少 DOM 操作
- ✅ **跨平台性**：虚拟 DOM 可以映射到浏览器 DOM、原生移动端、VR 等多种平台

#### 什么是 Fiber？

**Fiber** 是 React 16 引入的新**协调架构**（Reconciler），它不是要替代虚拟 DOM，而是**改变了如何处理虚拟 DOM 的方式**。

Fiber 将递归的同步更新过程改为可中断的异步链表遍历，通过链表结构连接各个节点，支持任务的暂停、恢复和优先级调度。

#### Fiber 的核心改进

Fiber 将每个虚拟 DOM 节点转换成一个 **Fiber 节点**，在虚拟 DOM 的基础上增加了链表指针和执行状态：

```javascript
// Fiber 节点结构（简化版）
{
  // 从虚拟 DOM 继承的属性
  type: 'div',
  props: { ... },
  key: null,

  // Fiber 新增：链表指针（替代递归调用栈）
  return: null,      // 指向父节点（相当于回退指针）
  child: null,       // 指向第一个子节点
  sibling: null,     // 指向下一个兄弟节点

  // Fiber 新增：工作状态（支持中断恢复）
  effectTag: null,   // 标记这个节点需要做什么操作（插入/删除/更新）
  lanes: 0,          // 优先级车道（18+ 使用，决定先处理哪个更新）
  alternate: null,   // 指向另一棵树的对应节点（用于双缓存）
}
```

#### 两者的关系总结

| 概念       | 本质                 | 作用                                    |
| ---------- | -------------------- | --------------------------------------- |
| 虚拟 DOM   | 数据结构（JS对象）   | 描述 UI 应该长什么样                    |
| Fiber      | 架构设计（协调算法） | 决定如何高效地更新虚拟 DOM              |
| Fiber 节点 | 虚拟 DOM 的执行单元  | 包含虚拟 DOM 信息 + 工作状态 + 链表指针 |

**关键点**：虚拟 DOM 在 React 16 前后都存在，Diff 的对比逻辑（同层比较、key 复用）也没变。变的是**执行过程**——从"同步递归执行"变成了"可中断的分段执行"。

TODO:这里需要根据其他文章来补充 我们diff之前的前置内容呀，我们的fiber.md就只讲fiber架构，我们的diff就只讲diff算法

## diff策略

那么，如何将**O(n^ 3)** 转化为**O(n)** 呢？

React通过**三大策略**完成了优化：

1.  Web UI 中 DOM 节点跨层级的移动操作特别少，可以忽略不计。
2.  拥有相同类的两个组件将会生成相似的树形结构，拥有不同类的两个组件将会生成不同的树形结构。
3.  对于同一层级的一组子节点，它们可以通过唯一 id 进行区分。

分别对应：`tree diff`、`component diff`、`element diff`

### tree diff

**tree diff**: **同级比较**。React 假设 DOM 节点跨层级的移动操作特别少（可以忽略不计），因此只对**同一层级**的节点进行 diff 对比。如果发现某个层级上的节点不存在了，会直接删除该节点及其子树，不会去其他层级查找。

这种"简单粗暴"的方式虽然会导致一些不必要的重建操作，但避免了跨层级遍历带来的 O(n³) 复杂度，而在实际开发中，跨层级移动节点的情况确实非常罕见。

**性能建议**：尽量保持 DOM 层级结构的稳定。

### component diff

**component diff**: **组件比较**。React 对组件类型的处理有两种策略：相同类型组件 vs 不同类型组件。

#### 相同类型组件

当组件类型相同时（比如都是 `<Button />`），React 会继续递归比较该组件内部的**虚拟 DOM 树**。

```jsx
// 更新前
<Button onClick={handleClick1}>提交</Button>

// 更新后（组件类型相同，都是 Button）
<Button onClick={handleClick2}>提交</Button>
```

React 会复用组件实例，只更新变化的 props（这里 `onClick` 从 `handleClick1` 变成 `handleClick2`）。

**优化技巧**：你可以使用 `shouldComponentUpdate()`（类组件）或 `React.memo()`（函数组件）告诉 React 跳过不必要的 diff 计算，当组件内部的虚拟 DOM 没有实质性变化时，直接复用上次的渲染结果。

#### 不同类型组件

当组件类型不同时，React 会判定该组件为 **dirty component（脏组件）**，直接卸载旧组件并创建新组件，即使两个组件的内部结构非常相似。

#### 具体示例

假设你将一个「头像组件」替换成了「图片标签」：

```jsx
// 更新前：自定义的 Avatar 组件
<Avatar src="user.jpg" size="large" />

// 更新后：原生的 img 标签
<img src="user.jpg" className="avatar-large" />
```

虽然两者最终渲染的 HTML 可能非常相似（都是 `<img>` 元素），但 React 判断它们是**不同类型的组件**：

1. 直接卸载整个 `Avatar` 组件及其所有子节点
2. 销毁 `Avatar` 的所有事件监听器和状态
3. 从头创建新的 `img` 元素

**为什么要这样处理？** 因为不同类型的组件通常有不同的生命周期、状态管理、事件处理方式，试图复用会带来更多复杂性。在实际开发中，组件类型变化但内部结构几乎一模一样的情况非常罕见，React 选择简单粗暴地"重建"来保证 diff 算法的 O(n) 复杂度。

### element diff

**element diff**：**节点比较**，对于同一层级的一子自节点，通过唯一的**key**进行比较

当所有节点处以同一层级时，`React` 提供了三种节点操作：`插入（INSERT_MARKUP）`、`移动（MOVE_EXISTING）`、`删除（REMOVE_NODE）`

- **INSERT_MARKUP**：新的 `component` 类型不在老集合里， 即是全新的节点，需要对新节点执行插入操作。

如：`C` 不在集合`A`、`B`中需要插入

- **MOVE_EXISTING**：在老集合有新 `component` 类型，且`element` 是可更新的类型，`generateComponentChildren` 已调用 `receiveComponent`，这种情况下`prevChild=nextChild`，就需要做移动操作，可以复用以前的 DOM 节点

如：当组件`D`在集合 `A、B、C、D`中，且集合更新时，`D`没有发生更新，只是位置发生了改变，如：`A、D、B、C`，`D`的位置有4变换到了2

如果是传统的diff，会让旧集合的第二个`B`和新集合的`D`做比较，删除第二个`B`，在插入`D`

`React`中的diff并不会这么做，而是通过`key`来进行直接移动

- **REMOVE_NODE**：老 `component` 类型，在新集合里也有，但对应的 `element` 不同则不能直接复用和更新，需要执行删除操作，或者老 `component` 不在新集合里的，也需要执行删除操作。

如： 组件`D`在集合 `A、B、C、D`中，如果集合变成了 新的集合`A、B、C`，`D`就需要删除

如果`D`的节点发生改变，不能`复用`和`更新`，此时会删除旧的`D`，再创建新的

#### 情形一：相同节点位置，如何移动

![图片](/images/posts/diff/img1.png)

顺序：

1.  `React`会判断(新中)第一个`B`是否在旧的中出现过，如果发现旧的中存在，然后判断是否去移动`B`
2.  判断`B`是否移动的条件为**index < lastIndex**,及在旧的`Index`为`1`，`lastIndex`为0，所以并不满足条件，因此不会移动`B`
3.  有的小伙伴可能会对`lastIndex`产生疑问，它到底是什么？实际上它是一个**浮标**，或者说是一个**map**的索引，一开始是默认的`0`，当每次比较后，会改变对应的值，也就是 `lastIndex=(index, lastIndex)`中的最大值，对第一步来说，就是`lastIndex=(1, 0)` => `lastIndex`为1
4.  此时到了`A`的比较，在旧的中`A`的`index`为0，`lastIndex`为1，满足`index < lastIndex`,因此对A进行移动，`lastIndex`还是为1
5.  相同的方法到`D`，`index`为3，`lastIndex`为1，`D`不移动，并且`lastIndex`为3
6.  相同的方法到`C`，`index`为2，`lastIndex`为3，`C`移动，`lastIndex`不变，此时操作结束

#### 情形二：有新的节点加入，删除节点

![图片](/images/posts/diff/img2.png)

顺序：

1.  `B`与上述讲的一样，不移动，`lastIndex`为1
2.  到`E`时，发现在旧的中并没有`E`这个节点，所以此时会建立，此时的`lastIndex`还是为1
3.  在`C`中，`index` 为 2，`lastIndex`为 1，所以此时不满足**index < lastIndex**，故C不移动，`lastIndex`更新为 2 4.`A`同理，A移动，`lastIndex`不更新，为2
4.  在新集合遍历完毕中，发现并没有`D`这个节点，所以会删除D，操作结束

#### 存在的问题

![图片](/images/posts/diff/img3.png)

我们来看看这种情况，如果将`D`移入到第一个，我们发现`lastIndex`为 3，之后在进行比较，发现`lastIndex`都大于`index`，所以剩下的节点都会移动，所以在开发的过程中应该尽量减少节点移入首部的操作，会影响其性能

## 扩展 如何在循环中正确的使用key？

> 我们知道，在我们进行循环的时候要加入`key`，那么`key`为什么说不能使用索引做为`key`值呢？有的时候在面试中也会问到，你在项目中`key`是如何设置的？为什么?

### 为什么不能用index做为key值 ？

![图片](/images/posts/diff/img4.png)

我们发现，当我们判断第一个`B`时，由于此时的`key`为0在旧的中`key`为0是`A`，`B`和`A`明显不是一个组件，所以会删除重建

所以无论是删除还是新增，或是移动，都会进行重新建立，这种方式与是否有`key`根本无关

### 为什么不能用index拼接其它值？

这种方式于上面的一样，因为每一个节点都找不到对应的key，导致所有的节点都不能复用，都会重新创建，所以不能

### 正确的方法，唯一值

只有通过唯一值，才能做到每一个节点都做到了复用，真正起到了diff算法的作用

#### 为什么 key 如此重要？

**key 的作用**：key 就像是列表中每个元素的身份 ID。当 Diff 算法比较列表时，它会根据 key 来匹配新旧节点。

**查找相同 key 的节点**：如果新旧列表中都有同一个 key 的节点，React 认为它们是同一个元素，然后比较它们的属性和子节点。

**查找新增加的 key**：如果新列表中有 key，但在旧列表中不存在，则认为是一个新节点，进行插入。

**查找被删除的 key**：如果旧列表中有 key，但在新列表中不存在，则被认为是旧节点，进行删除。

**为什么 key 必须稳定？** 如果 key 每次渲染都变化，Diff 算法就无法有效地识别出哪些元素是"同一个"，反而会认为所有元素都发生了变化，导致不必要的 DOM 重建，性能更差。

#### 为什么不能用 index 作为 key 的详细示例

```jsx
// 错误示例：使用 index 作为 key
{
  items.map((item, index) => <ListItem key={index} data={item} />);
}
```

如果列表顺序会改变（插入、删除、移动），使用 index 作为 key 会导致 Diff 算法误判：

```jsx
// 初始状态
// [A, B, C] - keys: [0, 1, 2]

// 删除 A
// [B, C] - keys: [0, 1]
// React 会认为：
// - key 0: A 变成了 B（错误！）
// - key 1: B 变成了 C（错误！）
// 结果：所有节点都被重建，而不是复用
```

**正确的方法**：使用唯一稳定的值作为 key：

```jsx
// 正确示例：使用唯一 ID 作为 key
{
  items.map((item) => <ListItem key={item.id} data={item} />);
}
```

## Diff 算法的作用总结

Diff 算法的核心在于比较虚拟 DOM 的差异，生成描述这些差异的补丁（Patch）。它通过对新旧虚拟 DOM 的节点进行递归比较，找出最小的更新集合，避免了直接操作 DOM 带来的性能损耗。

Diff 算法的高性能可以体现在两个方面：

- **最小限度的减少了新旧虚拟DOM树的比较开支**
- **最大限度地减少对真实 DOM 的操作**
