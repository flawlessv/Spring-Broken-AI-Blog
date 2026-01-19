---
---

# 「React深入」一文吃透虚拟DOM和diff算法虚拟DOM到底是什么，它与真实的DOM有什么不同？在React中，为什 - 掘金

> ## Excerpt
>
> 虚拟DOM到底是什么，它与真实的DOM有什么不同？在React中，为什么自定义组件的首字母要大写？有了虚拟DOM，性能就一定能够得到提升吗？...如果你对这些有疑问，那么这篇文章一定能帮助到你～

---

## 前言

`React`中的**虚拟DOM**和**diff算法**是非常核心的特型，了解它们是非常有必要，只有了解，才能深入。

我们直接来看看以下几个问题：

- `虚拟DOM`到底是什么，它与`真实的DOM`有什么不同？
- 在`React`中，为什么自定义组件的首字母要大写？
- 有了`虚拟DOM`，性能就一定能够得到提升吗？
- React的`diff算法`与传统的`diff算法`有什么区别？为什么受到吹捧？
- `diff策略`有哪些？它们是如何比较的？
- 为什么在循环中不要用索引（index）做`key`值呢？
- ...

## 虚拟DOM

## 与真实DOM对比

### 结构对比

我们首先用`React.createElement`和`document.createElement`创建以下，然后进行打印，看一下，虚拟DOM和真实DOM有什么区别：

```javascript
const VDOM = React.createElement("div", {}, "小杜杜");
const DOM = document.createElement("div");
DOM.innerHTML = "小杜杜";
console.log(`虚拟DOM：`, VDOM);
console.log(`真实DOM：`, DOM);
```

结果：

![1.png](%E3%80%8CReact%E6%B7%B1%E5%85%A5%E3%80%8D%E4%B8%80%E6%96%87%E5%90%83%E9%80%8F%E8%99%9A%E6%8B%9FDOM%E5%92%8Cdiff%E7%AE%97%E6%B3%95%E8%99%9A%E6%8B%9FDOM%E5%88%B0%E5%BA%95%E6%98%AF%E4%BB%80%E4%B9%88%EF%BC%8C%E5%AE%83%E4%B8%8E%E7%9C%9F%E5%AE%9E%E7%9A%84DOM%E6%9C%89%E4%BB%80%E4%B9%88%E4%B8%8D%E5%90%8C%EF%BC%9F%E5%9C%A8React%E4%B8%AD%EF%BC%8C%E4%B8%BA%E4%BB%80%20-%20%E6%8E%98%E9%87%91/58db2ee32bde44b3afd5e2e6af3e3647~tplv-k3u1fbpfcp-zoom-in-crop-mark1512000.awebp)

我们可以看出虚拟DOM是一个**对象**的结构，而真实的DOM是一个**dom**的结构，而这个**dom结构**究竟是什么呢？我们可以通过断点去看看： ![2.png](%E3%80%8CReact%E6%B7%B1%E5%85%A5%E3%80%8D%E4%B8%80%E6%96%87%E5%90%83%E9%80%8F%E8%99%9A%E6%8B%9FDOM%E5%92%8Cdiff%E7%AE%97%E6%B3%95%E8%99%9A%E6%8B%9FDOM%E5%88%B0%E5%BA%95%E6%98%AF%E4%BB%80%E4%B9%88%EF%BC%8C%E5%AE%83%E4%B8%8E%E7%9C%9F%E5%AE%9E%E7%9A%84DOM%E6%9C%89%E4%BB%80%E4%B9%88%E4%B8%8D%E5%90%8C%EF%BC%9F%E5%9C%A8React%E4%B8%AD%EF%BC%8C%E4%B8%BA%E4%BB%80%20-%20%E6%8E%98%E9%87%91/c859397a03024903939f934907052cc2~tplv-k3u1fbpfcp-zoom-in-crop-mark1512000.awebp)

我们可以看到，在真实的DOM上，默认会挂载很多属性和方法，但在实际中，我们并不需要去关心这些属性和方法（注意：这些属性和方法是默认的，因为标准是这么设计的）

所以从结构上来看：**虚拟DOM要比真实DOM轻很多**

### 操作对比

假设我们有以下列表：

```css
<ul>
    <li>1</li>
    <li>2</li>
    <li>3</li>
  </ul>
```

我们现在要将 1、2、3 替换为 4，5，6，7，我们直接操纵节点该如何处理？

- 第一种：我们可以将原列表的1、2、3替换为4、5、6，在新增一个li为7
- 第二种：我们直接把原列表的1、2、3对应的li删掉，在新增4、5、6、7
- 第三中：直接替换 ul的内容，用`innerHTML`直接覆盖

单纯操作来讲，第三种无疑是最方便的，第一种明显复杂一点，但从**性能上来讲**，第三种的性能最高，因为存在**重排**与**重绘**的问题，我们知道浏览器处理`DOM`是很慢的，如果页面比较复杂，频繁的操做`DOM`会造成很大的`开销`。

所以在原生的DOM中我们要想性能高，就只能选择第一种方案，但这样明显给我们带来了**复杂度**，不利于目前的开发（会在下文详细讲到～）

### 流程对比

在传统的`Web应用中`，数据的变化会实时地更新到用户界面中，于是每次数据微小的变化都会引起`DOM`的渲染。

而虚拟DOM的目：是将`所有`的操作聚集到一块，计算出所有的变化后，`统一更新`一次虚拟DOM

也就是说，一个页面如果有500次变化，没有虚拟DOM的就会渲染500次，而虚拟DOM只需要渲染一次，从这点上来看，页面越复杂，虚拟DOM的优势越大

![image.png](%E3%80%8CReact%E6%B7%B1%E5%85%A5%E3%80%8D%E4%B8%80%E6%96%87%E5%90%83%E9%80%8F%E8%99%9A%E6%8B%9FDOM%E5%92%8Cdiff%E7%AE%97%E6%B3%95%E8%99%9A%E6%8B%9FDOM%E5%88%B0%E5%BA%95%E6%98%AF%E4%BB%80%E4%B9%88%EF%BC%8C%E5%AE%83%E4%B8%8E%E7%9C%9F%E5%AE%9E%E7%9A%84DOM%E6%9C%89%E4%BB%80%E4%B9%88%E4%B8%8D%E5%90%8C%EF%BC%9F%E5%9C%A8React%E4%B8%AD%EF%BC%8C%E4%B8%BA%E4%BB%80%20-%20%E6%8E%98%E9%87%91/b16d46da6c7a44bfa1b3acfc2595a43b~tplv-k3u1fbpfcp-zoom-in-crop-mark1512000.awebp)

## 虚拟DOM是什么？

在上面我们说过`虚拟DOM`实际上就是**对象**，接下来详细看看这个对象有什么，栗子🌰：

```php-template
<div className='Index'>
      <div>我是小杜杜</div>
      <ul>
        <li>React</li>
        <li>Vue</li>
      </ul>
    </div>
```

转化后：

```css
{
        type: 'div',
        props: { class: 'Index' },
        children: [
            {
                type: 'div',
                children: '我是小杜杜'
            },
            {
                type: 'ul',
                children: [
                    {
                        type: 'li',
                        children: 'React'
                    },
                    {
                        type: 'li',
                        children: 'Vue'
                    },
                ]
            }
        ]
    }
```

主要转化为：

- type：实际的标签
- props：标签内部的属性（除`key`和`ref`，会形成单独的`key`名）
- children: 为节点内容，依次循环

从结构上来说，`虚拟DOM`并没有`真实DOM`哪些乱七八糟的东西，因此，我们就算直接把`虚拟DOM`删除后，重新建一个也是非常快的

## React中，组件为何要大写？

作为一个前端人，多多少少都知道`React`的核心是`JSX`语法,说白了，`JSX`就是`JS`上的扩展，就像一个拥有javascript全部功能的模板语言

我们写的代码最终是要呈现在浏览器上，浏览器会识别你的代码是`React`吗？很显然，浏览器并不知道你的代码是`React`,更不会识别`JSX`了，实际上浏览器对`ES6`的一些语法都识别不了，要想让浏览器识别，就需要借助`Babel`

要通过`Babel`去对`JSX`进行转化为对应的JS对象，才能让浏览器识别，此时就会有个依据去判断是`原生DOM标签`，还是`React组件`，而这个依据就是**标签的首字母**

如果标签的首字母是小写，就会被认定为**原生标签**，反之就是**React组件**

举个栗子🌰：

```javascript
class Info extends React.Component {
  render() {
    return (
      <div>
        Hi！我是小杜杜
        <p>欢迎</p>
        <Children>我是子组件</Children>
      </div>
    );
  }
}
```

上述代码会被翻译为：

```javascript
class Info extends React.Component {
        render(){
            return React.createElement(
                'div',
                null,
                "Hi！我是小杜杜",
                React.createElement('p', null, '欢迎')， // 原生标签
                React.createElement(
                    Children, //自定义组件
                    null, // 属性
                    '我是子组件'  //child文本内容
                )
            )
        }
    }
```

换言之，我们的JSX结构最终会被翻译为`React.createElement`的结构，那么为什么要使用`JSX`而不用 `createElement`书写呢？

其实这两种写法都是可以的，但`JSX`形式明显要比`createElement`方便很多。

综上所诉，在React中，组件大写的原因是`Babel`进行转化，需要一个条件去判断是原生标签还是自定义组件，通过首字母的大小写去判断

### 扩展 React.Fragment

在这里，额外说一下`React.Fragment`这个组件，熟悉`React`的小伙伴应该知道，在`React`中，组件是不允许返回多个节点的，如：

```javascript
return <p>我是小杜杜</p>
           <p>React</p>
           <p>Vue</p>
```

我们想要解决这种情况需要给为此套一个容器元素，如`<div></div>`

```javascript
return (
  <div>
    <p>我是小杜杜</p>
    <p>React</p>
    <p>Vue</p>
  </div>
);
```

但这样做，无疑会多增加一个节点，所以在`16.0`后，官方推出了`Fragment`碎片概念，能够让一个组件返回多个元素,**React.Fragment 等价于`<></>`**

```javascript
return (
  <React.Fragment>
    <p>我是小杜杜</p>
    <p>React</p>
    <p>Vue</p>
  </React.Fragment>
);
```

可以看到`React.Fragment`实际上是没有节点的 ![企业微信截图_34d1a03b-acdd-4ed0-9392-86fb764731c7.png](%E3%80%8CReact%E6%B7%B1%E5%85%A5%E3%80%8D%E4%B8%80%E6%96%87%E5%90%83%E9%80%8F%E8%99%9A%E6%8B%9FDOM%E5%92%8Cdiff%E7%AE%97%E6%B3%95%E8%99%9A%E6%8B%9FDOM%E5%88%B0%E5%BA%95%E6%98%AF%E4%BB%80%E4%B9%88%EF%BC%8C%E5%AE%83%E4%B8%8E%E7%9C%9F%E5%AE%9E%E7%9A%84DOM%E6%9C%89%E4%BB%80%E4%B9%88%E4%B8%8D%E5%90%8C%EF%BC%9F%E5%9C%A8React%E4%B8%AD%EF%BC%8C%E4%B8%BA%E4%BB%80%20-%20%E6%8E%98%E9%87%91/2b290182958b45ba81ce6441cbb405f5~tplv-k3u1fbpfcp-zoom-in-crop-mark1512000.awebp) 那么这个特殊的组件，会被`createElement`翻译的不一样吗？

其实是一样的，还是会被翻译为`React.createElement(React.Fragment, null, "")`这样的形式，这点要注意

同时在`React`也支持返回数组的形式，如：

```javascript
[1, 2, 3].map((item) => <p key={item}>{item}</p>);
```

实际上这种会被`React`的底层进行处理，默认会加入`Fragment`,也就是等价于

```php-template
<React.Fragment>
       <p>1</p>
       <p>2</p>
       <p>3</p>
    </React.Fragment>
```

> 我们知道 `<React.Fragment> </React.Fragment>` 等价于 `<></>`,那么他们有不同吗？

在上述讲过，`key`和`ref`会被单独存放，`ref`不用考虑，在循环数组时，我们必须要有`key`，实际上`<React.Fragment>`允许有`key`的，而`<></>`无法附上`key`，所以这是两者的差距

## 虚拟DOM的优势所在

### 提高效率

使用原生JS的时候，我们需要的关注点在**操作DOM**上，而`React`会通过`虚拟DOM`来确保`DOM`的匹配，也就是说，我们关注的点不在时如何操作`DOM`，怎样更新`DOM`，`React`会将这一切处理好

此时，我们更加关注于业务逻辑，从而提高开发效率

### 性能提升

> 经过之前的讲解，我们发现`虚拟DOM`优势明显强于`真实的DOM`,我们来看看`虚拟DOM`如何工作的？

实际上，`React`会将整个`DOM`保存为`虚拟DOM`，如果有更新，都会维护两个虚拟DOM，以此来比较`之前的状态`和`当前的状态`,并会确定哪些状态被修改，然后将这些变化更新到`实际DOM上`,一旦真正的DOM发生改变，也会更新UI

要牢记一句话：**浏览器在处理DOM的时候会很慢，处理JavaScript会很快**

所以在`虚拟DOM`感受到变化的时候，只会更新**局部**，而非**整体**。同时，`虚拟DOM`会减少了非常多的`DOM操作` ，所以性能会提升很多

#### 虚拟DOM一定会提高性能吗？

通过上面的理解，很多人认为`虚拟DOM`一定会提高性能，一定会更快，其实这个说法有点片面，因为`虚拟DOM`虽然会减少`DOM操作`，但也无法避免`DOM`操作

它的优势是在于`diff算法`和`批量处理策略`,将所有的DOM操作搜集起来，一次性去改变真实的`DOM`,但在首次渲染上，`虚拟DOM`会多了一层计算，消耗一些性能，所以有可能会比`html`渲染的要慢

注意，`虚拟DOM`实际上是给我们找了一条最短，最近的路径，并不是说比DOM操作的更快，而是路径最简单

就好比条条大路通罗马，虽然走的方向不同，但最终到达的目的地都是相通的，不同的路径对应的时间不同，`虚拟DOM`就是规划出最短的路径，但最终还是需要人（真实DOM）去走的（有不对的地方，欢迎评论区讨论～）

### 超强的兼容性

`React`具有超强的兼容性，可分为：**浏览器的兼容**和**跨平台兼容**

- `React`基于`虚拟DOM`实现了一套自己的事件机制，并且模拟了事件冒泡和捕获的过程，采取**事件代理**、**批量更新**等方法，从而磨平了各个浏览器的事件兼容性问题
- 对于跨平台，`React`和`React Native`都是根据**虚拟DOM**画出相应平台的`UI`层，只不过不同的平台画法不同而已

## 虚拟DOM如何实现？

### 构建虚拟DOM

我们构建的`JSX`代码会被转为`React.createElement`的形式，如下图：

![1.png](%E3%80%8CReact%E6%B7%B1%E5%85%A5%E3%80%8D%E4%B8%80%E6%96%87%E5%90%83%E9%80%8F%E8%99%9A%E6%8B%9FDOM%E5%92%8Cdiff%E7%AE%97%E6%B3%95%E8%99%9A%E6%8B%9FDOM%E5%88%B0%E5%BA%95%E6%98%AF%E4%BB%80%E4%B9%88%EF%BC%8C%E5%AE%83%E4%B8%8E%E7%9C%9F%E5%AE%9E%E7%9A%84DOM%E6%9C%89%E4%BB%80%E4%B9%88%E4%B8%8D%E5%90%8C%EF%BC%9F%E5%9C%A8React%E4%B8%AD%EF%BC%8C%E4%B8%BA%E4%BB%80%20-%20%E6%8E%98%E9%87%91/58db2ee32bde44b3afd5e2e6af3e3647~tplv-k3u1fbpfcp-zoom-in-crop-mark1512000.awebp)

**React.createElement**：它的功能是将`props`和`子元素`进行处理后返回一个`ReactElement`对象(`key`和`ref`会特殊处理)

#### ReactElement

`ReactElement`这个对象会将传入的几个属性进行组合并返回

- type：实际的标签
- props：标签内部的属性（除`key`和`ref`，会形成单独的`key`名）
- children: 为节点内容，依次循环
- **type**：实际的标签，原生的标签（如'div'），自定义组件（类或是函数式）
- **props**：标签内部的属性（除`key`和`ref`，会形成单独的`key`名）
- **key**：组件内的唯一标识，用于`Diff`算法
- **ref**：用于访问原生`dom`节点
- **owner**：当前正在构建的`Component`所属的`Component`
- **?typeof**：默认为`REACT_ELEMENT_TYP`，可以防止**XXS**

#### 扩展 预防XSS

**XSS攻击(跨站脚本攻击)**：通常指的是通过利用发时留下的漏洞，通过巧妙的方法注入恶意指令代码到网页，使用户加载并执行攻击者恶意制造的网页程序。

`React`自身可以预防`XSS`,主要依靠的就是 **?typeof**

```javascript
var REACT_ELEMENT_TYPE =
  (typeof Symbol === "function" && Symbol.for && Symbol.for("react.element")) ||
  0xeac7;
```

从上述代码我们知道`?typeof`实际上是`Symbol`类型，当然`Symbol`是ES6的，如果环境不支持`ES6`，`?typeof`会被赋值于 `0xeac7`

那么这个变量为什么可以预防**XSS**呢？

简单的说，用户存储的JSON对象可以是任意的字符串，这可能会带来潜在的危险，而JSON对象不能存储于`Symbol`类型的变量，React 可以在渲染的时候把没有`?type` 标识的组件过滤掉，从而达到预防XSS的功能

### 转化为真实DOM

`虚拟DOM`转化为`真实DOM`的这个过程实际上非常复杂，大体上可以分为四步： `处理参数`、`批量处理`、`生成html`和`渲染html`

- **处理参数**：当我们处理好组件后，我们需要`ReactDOM.render(element, container[, callback])`将组件进行渲染，这里会判断是原生标签还是React自定义组件
- **批量处理**：这个过程就会统一进行处理，具体的执行机制，之后会单独写篇文章讲解
- **生成html**：对特殊的`DOM`标签、`props`进行处理，并根据对应的标签类型创造对应的`DOM`节点，利用`updateDOMProperties`将`props`插入到`DOM`节点，最后渲染到上面
- **渲染html**：渲染html节点，渲染文本节点，但不同的浏览器可能会做不同的处理

## diff算法

经过上面的讲解，我们知道`React`会维护两个`虚拟DOM`，那么是如何来比较，如何来判断，做出最优的解呢？这就用到了**diff算法**

## 与传统的diff算法相比较

在`React`中，最值得夸赞的地方就是`虚拟DOM`与`diff`算法的结合，发展至今，个人认为`React`的diff算法远比传统的diff算法出名很多，那么原因究竟是什么呢？

`React`中的`diff`算法并非首创，而是引入，`React`团队为`diff算法`做出了**质**的优化，举个🌰

在计算一颗树转化为另一颗树有哪些改变时，`传统的diff算法`通过循环递归对节点进行依此对比，其算法复杂度达到了**O(n^ 3)**，也就是说，如果展示 **一千个节点**，就要计算**十亿次**

再来看看`React`中的`diff`算法，算法复杂度为**O(n)**,如果展示**一千个节点**，就要计算**一千次**

从十亿次更新到一千次，这可不是一点点的优化，而是非常巨大的优化，真心的佩服

## diff策略

那么，如何将**O(n^ 3)** 转化为**O(n)** 呢？

React通过**三大策略**完成了优化：

1.  Web UI 中 DOM 节点跨层级的移动操作特别少，可以忽略不计。
2.  拥有相同类的两个组件将会生成相似的树形结构，拥有不同类的两个组件将会生成不同的树形结构。
3.  对于同一层级的一组子节点，它们可以通过唯一 id 进行区分。

分别对应：`tree diff`、`component diff`、`element diff`

### tree diff

**tree diff**: **同级比较**,既然DOM 节点跨层级的移动操作少到可以忽略不计，那么`React`通过`updateDepth` 对 `Virtual DOM 树`进行层级控制，也就是同一层，在对比的过程中，如果发现节点不在了，会`完全删除`不会对其他地方进行比较，这样只需要对树`遍历一次`就OK了

栗子🌰：

![image.png](%E3%80%8CReact%E6%B7%B1%E5%85%A5%E3%80%8D%E4%B8%80%E6%96%87%E5%90%83%E9%80%8F%E8%99%9A%E6%8B%9FDOM%E5%92%8Cdiff%E7%AE%97%E6%B3%95%E8%99%9A%E6%8B%9FDOM%E5%88%B0%E5%BA%95%E6%98%AF%E4%BB%80%E4%B9%88%EF%BC%8C%E5%AE%83%E4%B8%8E%E7%9C%9F%E5%AE%9E%E7%9A%84DOM%E6%9C%89%E4%BB%80%E4%B9%88%E4%B8%8D%E5%90%8C%EF%BC%9F%E5%9C%A8React%E4%B8%AD%EF%BC%8C%E4%B8%BA%E4%BB%80%20-%20%E6%8E%98%E9%87%91/79baab17d9a14df6b30c07f2e0e7ed11~tplv-k3u1fbpfcp-zoom-in-crop-mark1512000.awebp)

- 如上图，比较的时候会一层一层比较，也就是图中蓝框的比较
- 到第二层的时候我们发现，`L` 带着`B`和`C`从`A`的下面，跑到了`R`的下面，按理说应该把`L`移到`R`的下方，但这样会牵扯到跨层级比较，有可能在层级上移动的非常多，导致时间复杂度陡然上升
- 所以在这里，React会删掉整个A，然后重新创建，但这种情况在实际中会非常少见

注意：**保持DOM的稳定**会有助于性能的提升，合理的利用显示和隐藏效果会更好，而不是真正的**删除**或**增加**DOM节点

### component diff

**component diff**：**组件比较**，`React`对于组件的策略有两种方式，一种是相同类型的组件和不同类型的组件

- 对同种类型组件对比，按照**层级比较**继续比较**虚拟DOM**树即可，但有种特殊的情况，当组件A如果变化为组件B的时候，有可能**虚拟DOM**并没有任何变化，所以用户可以通过**shouldComponentUpdate()** 来判断是否需要更新，判断是否计算
- 对于不同组件来说，`React`会直接判定该组件为**dirty component（脏组件）**，无论结构是否相似，只要判断为**脏组件**就会直接替换整个组件的所有节点

举个栗子🌰：

![image.png](%E3%80%8CReact%E6%B7%B1%E5%85%A5%E3%80%8D%E4%B8%80%E6%96%87%E5%90%83%E9%80%8F%E8%99%9A%E6%8B%9FDOM%E5%92%8Cdiff%E7%AE%97%E6%B3%95%E8%99%9A%E6%8B%9FDOM%E5%88%B0%E5%BA%95%E6%98%AF%E4%BB%80%E4%B9%88%EF%BC%8C%E5%AE%83%E4%B8%8E%E7%9C%9F%E5%AE%9E%E7%9A%84DOM%E6%9C%89%E4%BB%80%E4%B9%88%E4%B8%8D%E5%90%8C%EF%BC%9F%E5%9C%A8React%E4%B8%AD%EF%BC%8C%E4%B8%BA%E4%BB%80%20-%20%E6%8E%98%E9%87%91/94d5d62774064dda8ef7abd8b873dd78~tplv-k3u1fbpfcp-zoom-in-crop-mark1512000.awebp)

在比较时发现`D => G`，虽然两个组件的结构非常相似，`React`判断这两个组件并不是同一个组件（dirty component），就会直接删除 `D`，重新构建 `G`,在实际中，两个组件不同，但结构又非常相似，这样的情况会很少的

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

![image.png](%E3%80%8CReact%E6%B7%B1%E5%85%A5%E3%80%8D%E4%B8%80%E6%96%87%E5%90%83%E9%80%8F%E8%99%9A%E6%8B%9FDOM%E5%92%8Cdiff%E7%AE%97%E6%B3%95%E8%99%9A%E6%8B%9FDOM%E5%88%B0%E5%BA%95%E6%98%AF%E4%BB%80%E4%B9%88%EF%BC%8C%E5%AE%83%E4%B8%8E%E7%9C%9F%E5%AE%9E%E7%9A%84DOM%E6%9C%89%E4%BB%80%E4%B9%88%E4%B8%8D%E5%90%8C%EF%BC%9F%E5%9C%A8React%E4%B8%AD%EF%BC%8C%E4%B8%BA%E4%BB%80%20-%20%E6%8E%98%E9%87%91/f8db39f510b645e48e308a3fb8088fbd~tplv-k3u1fbpfcp-zoom-in-crop-mark1512000.awebp)

顺序：

1.  `React`会判断(新中)第一个`B`是否在旧的中出现过，如果发现旧的中存在，然后判断是否去移动`B`
2.  判断`B`是否移动的条件为**index < lastIndex**,及在旧的`Index`为`1`，`lastIndex`为0，所以并不满足条件，因此不会移动`B`
3.  有的小伙伴可能会对`lastIndex`产生疑问，它到底是什么？实际上它是一个**浮标**，或者说是一个**map**的索引，一开始是默认的`0`，当每次比较后，会改变对应的值，也就是 `lastIndex=(index, lastIndex)`中的最大值，对第一步来说，就是`lastIndex=(1, 0)` => `lastIndex`为1
4.  此时到了`A`的比较，在旧的中`A`的`index`为0，`lastIndex`为1，满足`index < lastIndex`,因此对A进行移动，`lastIndex`还是为1
5.  相同的方法到`D`，`index`为3，`lastIndex`为1，`D`不移动，并且`lastIndex`为3
6.  相同的方法到`C`，`index`为2，`lastIndex`为3，`C`移动，`lastIndex`不变，此时操作结束

#### 情形二：有新的节点加入，删除节点

![image.png](%E3%80%8CReact%E6%B7%B1%E5%85%A5%E3%80%8D%E4%B8%80%E6%96%87%E5%90%83%E9%80%8F%E8%99%9A%E6%8B%9FDOM%E5%92%8Cdiff%E7%AE%97%E6%B3%95%E8%99%9A%E6%8B%9FDOM%E5%88%B0%E5%BA%95%E6%98%AF%E4%BB%80%E4%B9%88%EF%BC%8C%E5%AE%83%E4%B8%8E%E7%9C%9F%E5%AE%9E%E7%9A%84DOM%E6%9C%89%E4%BB%80%E4%B9%88%E4%B8%8D%E5%90%8C%EF%BC%9F%E5%9C%A8React%E4%B8%AD%EF%BC%8C%E4%B8%BA%E4%BB%80%20-%20%E6%8E%98%E9%87%91/5a6946c01f3142948e2a7cced8d680dc~tplv-k3u1fbpfcp-zoom-in-crop-mark1512000.awebp)

顺序：

1.  `B`与上述讲的一样，不移动，`lastIndex`为1
2.  到`E`时，发现在旧的中并没有`E`这个节点，所以此时会建立，此时的`lastIndex`还是为1
3.  在`C`中，`index` 为 2，`lastIndex`为 1，所以此时不满足**index < lastIndex**，故C不移动，`lastIndex`更新为 2 4.`A`同理，A移动，`lastIndex`不更新，为2
4.  在新集合遍历完毕中，发现并没有`D`这个节点，所以会删除D，操作结束

#### 存在的问题

![image.png](%E3%80%8CReact%E6%B7%B1%E5%85%A5%E3%80%8D%E4%B8%80%E6%96%87%E5%90%83%E9%80%8F%E8%99%9A%E6%8B%9FDOM%E5%92%8Cdiff%E7%AE%97%E6%B3%95%E8%99%9A%E6%8B%9FDOM%E5%88%B0%E5%BA%95%E6%98%AF%E4%BB%80%E4%B9%88%EF%BC%8C%E5%AE%83%E4%B8%8E%E7%9C%9F%E5%AE%9E%E7%9A%84DOM%E6%9C%89%E4%BB%80%E4%B9%88%E4%B8%8D%E5%90%8C%EF%BC%9F%E5%9C%A8React%E4%B8%AD%EF%BC%8C%E4%B8%BA%E4%BB%80%20-%20%E6%8E%98%E9%87%91/94dc4be27a4e46a59de6d5d9382639f7~tplv-k3u1fbpfcp-zoom-in-crop-mark1512000.awebp)

我们来看看这种情况，如果将`D`移入到第一个，我们发现`lastIndex`为 3，之后在进行比较，发现`lastIndex`都大于`index`，所以剩下的节点都会移动，所以在开发的过程中应该尽量减少节点移入首部的操作，会影响其性能

## 扩展 如何在循环中正确的使用key？

> 我们知道，在我们进行循环的时候要加入`key`，那么`key`为什么说不能使用索引做为`key`值呢？有的时候在面试中也会问到，你在项目中`key`是如何设置的？为什么?

### 为什么不能用index做为key值 ？

![image.png](%E3%80%8CReact%E6%B7%B1%E5%85%A5%E3%80%8D%E4%B8%80%E6%96%87%E5%90%83%E9%80%8F%E8%99%9A%E6%8B%9FDOM%E5%92%8Cdiff%E7%AE%97%E6%B3%95%E8%99%9A%E6%8B%9FDOM%E5%88%B0%E5%BA%95%E6%98%AF%E4%BB%80%E4%B9%88%EF%BC%8C%E5%AE%83%E4%B8%8E%E7%9C%9F%E5%AE%9E%E7%9A%84DOM%E6%9C%89%E4%BB%80%E4%B9%88%E4%B8%8D%E5%90%8C%EF%BC%9F%E5%9C%A8React%E4%B8%AD%EF%BC%8C%E4%B8%BA%E4%BB%80%20-%20%E6%8E%98%E9%87%91/d3732b5b8eb04748a488567954242f23~tplv-k3u1fbpfcp-zoom-in-crop-mark1512000.awebp)

我们发现，当我们判断第一个`B`时，由于此时的`key`为0在旧的中`key`为0是`A`，`B`和`A`明显不是一个组件，所以会删除重建

所以无论是删除还是新增，或是移动，都会进行重新建立，这种方式与是否有`key`根本无关

### 为什么不能用index拼接其它值？

这种方式于上面的一样，因为每一个节点都找不到对应的key，导致所有的节点都不能复用，都会重新创建，所以不能

### 正确的方法，唯一值

只有通过唯一值，才能做到每一个节点都做到了复用，真正起到了diff算法的作用

![image.png](%E3%80%8CReact%E6%B7%B1%E5%85%A5%E3%80%8D%E4%B8%80%E6%96%87%E5%90%83%E9%80%8F%E8%99%9A%E6%8B%9FDOM%E5%92%8Cdiff%E7%AE%97%E6%B3%95%E8%99%9A%E6%8B%9FDOM%E5%88%B0%E5%BA%95%E6%98%AF%E4%BB%80%E4%B9%88%EF%BC%8C%E5%AE%83%E4%B8%8E%E7%9C%9F%E5%AE%9E%E7%9A%84DOM%E6%9C%89%E4%BB%80%E4%B9%88%E4%B8%8D%E5%90%8C%EF%BC%9F%E5%9C%A8React%E4%B8%AD%EF%BC%8C%E4%B8%BA%E4%BB%80%20-%20%E6%8E%98%E9%87%91/5a6946c01f3142948e2a7cced8d680dc~tplv-k3u1fbpfcp-zoom-in-crop-mark1512000.awebp)

## 玩转 React Hooks 小册

小册链接：[《玩转 React Hooks》](https://juejin.cn/book/7230622711905517605?utm_source=course_list "https://juejin.cn/book/7230622711905517605?utm_source=course_list")

知其然，知其所以然。React Hooks 带来的全新机制让人耳目一新，因为它拓展了 React 的开发思路，为 React 开发者提供了一种更方便、更简洁的选择。

在引入 Hooks 的概念后，函数组件既保留了原本的简洁，也具备了状态管理、生命周期管理等能力，在原来 Class 组件所具备的能力基础上，还解决了 Class 组件存在的一些代码冗余、逻辑难以复用等问题。**因此，在如今的 React 中，Hooks 已经逐渐取代了 Class 的地位，成了主导。**

而且，Hooks 相对于 Class 而言，更容易上手，其`简洁性、逻辑复用性`等特性深受开发者喜爱，可谓是`前端界的"流量明星"`，不止 React，Vue 3.0 、Preact、Solid.js 等框架也都选择加入 Hooks 的大家庭，前端的日常工作也在趋向于 Hooks 开发。

因此，掌握好 React Hooks 是非常有必要的一件事。本小册会通过基础篇、原码篇、实践篇 **`三大方向`** 探讨 Hooks，从原码的角度探寻 React 的奥秘。

除此之外，小册会以 React Hooks 为核心，同时穿插其他知识，如 TS、Jest、Fiber 等核心知识，并包含 React v18 的并发、数据撕裂等概念，最后结合 Hooks 写一个简易版 react-redux 和 Form 表单，通过其设计思想，助你在面试中脱颖而出。

小册整体设计如下`思维导图`所示：

![玩转hooks.png](%E3%80%8CReact%E6%B7%B1%E5%85%A5%E3%80%8D%E4%B8%80%E6%96%87%E5%90%83%E9%80%8F%E8%99%9A%E6%8B%9FDOM%E5%92%8Cdiff%E7%AE%97%E6%B3%95%E8%99%9A%E6%8B%9FDOM%E5%88%B0%E5%BA%95%E6%98%AF%E4%BB%80%E4%B9%88%EF%BC%8C%E5%AE%83%E4%B8%8E%E7%9C%9F%E5%AE%9E%E7%9A%84DOM%E6%9C%89%E4%BB%80%E4%B9%88%E4%B8%8D%E5%90%8C%EF%BC%9F%E5%9C%A8React%E4%B8%AD%EF%BC%8C%E4%B8%BA%E4%BB%80%20-%20%E6%8E%98%E9%87%91/b5261b6a18b944ac94cfcbebac0b246a~tplv-k3u1fbpfcp-zoom-in-crop-mark1512000.awebp)

## End

`虚拟DOM`和`diff算法`是`React`中比较核心的，也是面试中比较常见的，在网上找了许多资料，整理学习，在这里面牵扯到一些`React事件机制`的问题，之后会专门做一章进行总结，还请多多关注～

> 说实话，写这种硬文真的有点累，而且花费的时间也较长，但如果你耐心看下去，一定会让你受益良多的，`【点赞】`\+ `【收藏】`\= `【学会了】`，还请各位小伙伴多多支持，后续还会有 `React` 的硬文，关注我，一起上车学习`React`吧～

其他React好文：

- [搞懂这12个Hooks，保证让你玩转React](https://juejin.cn/post/7101486767336849421 "https://juejin.cn/post/7101486767336849421")
- [作为一名React，我是这样理解HOC的](https://juejin.cn/post/7103345085089054727 "https://juejin.cn/post/7103345085089054727")
- [花三个小时，完全掌握分片渲染和虚拟列表～](https://juejin.cn/post/7121551701731409934/ "https://juejin.cn/post/7121551701731409934/")
- [「React 深入」一文吃透React v18全部Api（1.3w+）](https://juejin.cn/post/7124486630483689485 "https://juejin.cn/post/7124486630483689485")
