# React差异化DOM导出图片技术方案

## 一、问题背景

我们有一个需求是把页面内容导出为图片，但导出的内容和当前页面展示的不一样。比如导出报告时需要隐藏操作按钮、调整布局样式，再比如当前页面有20个轮播图，每一页最多展示5个，导出的时候需要把20个轮播图全部平铺出来。

这个需求的核心挑战是：**html2canvas本身不支持差异化DOM导出，它只是一个截图工具，只能对当前可见的DOM进行截图。**

主要问题包含两部分：

第一，如果直接修改当前页面的DOM，会影响用户的正常使用体验。比如，导出时需要隐藏某些按钮，如果直接操作当前页面的DOM，用户会看到按钮突然消失，体验很差。

第二，如果使用服务端方案，比如Puppeteer，虽然功能强大，但需要后端服务支持，响应时间长，而且资源消耗大，成本高。

**Puppeteer方案简介**

Puppeteer是Google开发的Node.js库，可以通过DevTools协议控制无头Chrome浏览器。它的截图思路是：

1. **启动无头浏览器** - 在服务端启动一个Chrome实例
2. **访问页面** - 通过`page.goto()`加载指定URL或HTML内容
3. **操作DOM** - 可以执行JavaScript代码，修改页面样式、隐藏元素等
4. **截图导出** - 调用`page.screenshot()`生成图片

虽然Puppeteer能完美支持差异化导出，但存在明显劣势：需要维护后端服务、浏览器实例占用内存大（每个实例约100-200MB）、响应时间长（冷启动需要1-3秒）、并发处理需要复杂的资源池管理，整体成本较高。

---

## 二、解决方案：隐藏DOM + React渲染 + html2canvas截图

我的解决思路是「隐藏DOM容器 + React渲染 + html2canvas截图」三步走。

**第一步是创建隐藏容器**。我在页面外创建一个绝对定位的div容器，通过设置`left: -9999px`把它移出视口，这样既不影响页面展示，又能让html2canvas正常访问。

**第二步是React组件渲染**。使用`ReactDOM.render`把导出内容渲染到隐藏容器中，这样可以支持完整的React功能，包括Hooks、Context、状态管理等。

**第三步是html2canvas截图**。等待渲染完成后，用html2canvas对隐藏容器进行截图，然后下载图片。

这里需要特别说明的是，html2canvas并不是真正的屏幕截图，而是**模拟浏览器渲染过程**，将DOM转换为Canvas。它的工作流程是：

1. **遍历DOM树** - 递归遍历目标元素，收集所有节点信息
2. **计算样式** - 通过`getComputedStyle`获取每个节点的计算样式
3. **构建渲染队列** - 根据层级关系（z-index、position）构建绘制队列
4. **Canvas绘制** - 使用Canvas API（fillRect、fillText、drawImage）进行绘制

所以，即使元素在视口外，只要它在DOM中且样式完整，html2canvas就能正确渲染。这就是隐藏DOM方案的理论基础。

---

## 三、为什么选择这个方案？

我对比了三种方案：

| 方案            | 核心特点                      | 优点                            | 缺点                       |
| --------------- | ----------------------------- | ------------------------------- | -------------------------- |
| 隐藏DOM（推荐） | 创建隐藏容器渲染导出内容      | 支持完整React功能、样式支持完整 | 需要真实DOM渲染            |
| React Portal    | 用Portal渲染到隐藏容器        | 代码结构清晰、支持调试          | 本质与方案一类似           |
| iframe隔离渲染  | renderToStaticMarkup + iframe | 性能最好、环境隔离              | 不支持Hooks、需手动注入CSS |

我选择隐藏DOM方案的原因是：

**第一是功能完整性**。它支持所有React特性，包括useState、useEffect、Context、自定义Hooks等，导出组件可以完全复用业务逻辑，不需要重写。iframe方案用的是`renderToStaticMarkup`，这是服务端渲染API，只能生成静态HTML，不支持任何Hooks。

**第二是样式支持完整**。支持所有CSS特性，包括CSS模块、Tailwind、styled-components等，html2canvas能正确读取计算样式，导出效果与页面展示完全一致。

**第三是实现简单**。核心代码只有50行左右，封装为自定义Hook后使用很方便。

---

## 四、具体实现与技术难点

### 整体实现流程

隐藏DOM如果在页面加载时就常驻渲染，会带来额外的布局和内存开销。所以我的策略是**"点击导出才做事，用完立刻销毁"**：

1. **动态导入依赖** - 使用`import()`动态加载html2canvas，减少首屏包体积（html2canvas约200KB）
2. **延迟创建容器** - 只在用户点击导出按钮时才创建隐藏DOM容器
3. **渲染导出内容** - 用React渲染差异化的导出组件到隐藏容器
4. **截图并下载** - 用html2canvas截图，生成图片下载
5. **立即清理资源** - 导出完成后立刻清理：卸载组件 → 移除DOM → 回收URL

```typescript
const handleExport = async () => {
  // 1. 动态导入html2canvas（不影响首屏）
  const html2canvas = (await import("html2canvas")).default;

  // 2. 创建临时隐藏容器
  const exportContainer = document.createElement("div");
  exportContainer.style.cssText = "position:absolute;left:-9999px;top:0;width:1200px;";
  document.body.appendChild(exportContainer);

  try {
    // 3. 渲染导出内容
    await renderHiddenAndWaitCommitted(exportContainer, <ExportContent />);

    // 4. 截图并下载
    const canvas = await html2canvas(exportContainer);
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "export.png";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
    });
  } finally {
    // 5. 立即清理
    ReactDOM.unmountComponentAtNode(exportContainer);
    exportContainer.parentNode?.removeChild(exportContainer);
  }
};
```

这种按需渲染的策略确保了：首屏零成本（不点导出就没有任何额外开销）、运行时高效（用完立刻销毁）、包体积优化（html2canvas只在点击导出时才加载）。

在这个流程中，有两个技术难点需要特别处理。

### 难点1：如何精确判断渲染完成时机？

上面代码里的`renderHiddenAndWaitCommitted`是关键函数。React的渲染是异步的，`render`之后立刻截图，很容易截到"还没commit完成"的中间态。

我不采用`setTimeout`或`MutationObserver`这种偏经验的等待方式，而是用**React官方提供的commit信号**来判断渲染完成。

具体做法是：在导出内容外层包一层Gate组件，在它的`useLayoutEffect`里发出ready信号。`useLayoutEffect`的语义是：**DOM已经被React写入（commit），并且在浏览器绘制之前执行**，这是我们能拿到的最确定时机。

为什么用`useLayoutEffect`而不是`useEffect`呢？两者的核心区别在于执行时机：

- `useLayoutEffect`是在DOM更新后、浏览器绘制前**同步执行**的，时序可控
- `useEffect`是在浏览器绘制完成后**异步执行**的，可能被事件循环中的其他任务延迟

虽然`useEffect`理论上也能工作，但`useLayoutEffect`提供了更好的同步性保证，更适合这种需要精确控制DOM读取时机的场景。

ready之后，我还会调用一次`container.getBoundingClientRect()`，这个操作会**强制浏览器完成一次layout计算**，确保所有CSS样式都已经被完全计算并应用到DOM上。这一步对于复杂布局尤其重要，因为某些CSS属性比如transform、flex布局的计算可能会被浏览器延迟。

```typescript
const renderHiddenAndWaitCommitted = async (
  container: HTMLElement,
  element: React.ReactElement
): Promise<void> => {
  let resolveReady!: () => void;
  const ready = new Promise<void>((r) => (resolveReady = r));

  const Gate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    useLayoutEffect(() => {
      resolveReady();  // DOM已commit，发出ready信号
    }, []);
    return <>{children}</>;
  };

  ReactDOM.render(<Gate>{element}</Gate>, container);
  await ready;

  // 强制layout，让计算样式稳定
  container.getBoundingClientRect();
};
```

这个方案的依据是**React的生命周期语义**，不是"猜浏览器什么时候渲染完"，所以更可解释、也更稳定。

### 难点2：如何防止内存泄漏？

隐藏DOM容器如果不正确处理，会导致多处内存泄漏。我系统性地处理了三个关键点：

**第一是React组件卸载**。这是最关键的一点。必须调用`ReactDOM.unmountComponentAtNode`来卸载组件，否则组件内部的事件监听器、定时器、订阅等都不会被清理，导致严重的内存泄漏。

**第二是DOM节点移除**。必须从`document.body`中移除容器节点，否则即使不可见，浏览器仍然会保留DOM树的引用。

**第三是Object URL回收**。使用`URL.createObjectURL`创建的Blob URL必须手动调用`URL.revokeObjectURL`回收，这是很多开发者容易忽略的点。

关键点是使用`try-finally`确保清理逻辑一定会执行，先卸载React组件再移除DOM节点，顺序很重要。这部分代码在上面的`handleExport`函数的finally块里已经展示了。

---

## 五、其他方案的适用场景

**React Portal方案**：本质上与隐藏DOM方案类似，但有一个优势是可以支持调试模式。如果导出内容有问题，可以把隐藏容器改为可见容器，临时显示导出内容，方便调试样式和布局。

**iframe隔离渲染方案**：使用`renderToStaticMarkup`生成HTML字符串，在iframe中渲染。但这是服务端渲染API，不支持Hooks和动态功能，只适合纯静态组件。大多数场景不推荐使用。

**原地切换"导出态"方案**：不渲染隐藏DOM，而是在点击导出时把页面本体短暂切到导出态，截完马上还原。优点是不需要额外渲染一棵隐藏组件树，缺点是复杂页面可能有重排带来的卡顿/闪动风险，而且会触碰页面真实状态。适合差异很小、可接受导出时冻结交互的场景。

---

## 六、总结

隐藏DOM方案在功能完整性、样式支持、实现简单性和兼容性方面都有很好的表现，适合大多数场景。

核心实现要点是三个：

1. 按需渲染，点击导出才创建容器，用完立刻销毁
2. 用`useLayoutEffect`精确判断渲染完成时机
3. 用`try-finally`确保内存清理（卸载组件 → 移除DOM → 回收URL）

这个方案已经在项目中稳定运行，支持多种导出场景，用户体验良好。
