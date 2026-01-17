---
title: JavaScript深入之作用域链
description: JavaScript深入系列第五篇，讲述作用链的创建过程，最后结合着变量对象，执行上下文栈，让我们一起捋一捋函数创建和执行的过程中到底发生了什么？
created: 2024-01-01T00:00:00 (UTC +08:00)
tags: [JavaScript]
category: 前端
---

# JavaScript深入之作用域链

在之前的文章中，我们讲到当 JavaScript 代码执行一段可执行代码(executable code)时，会创建对应的执行上下文(execution context)。

对于每个执行上下文，都有三个重要属性：

- 变量对象(Variable object，VO)
- 作用域链(Scope chain)
- this

今天重点讲讲作用域链。

## 作用域链

在《JavaScript深入之变量对象》中讲到，当查找变量的时候，会先从当前上下文的变量对象中查找，如果没有找到，就会从父级(词法层面上的父级)执行上下文的变量对象中查找，一直找到全局上下文的变量对象，也就是全局对象。这样由多个执行上下文的变量对象构成的链表就叫做作用域链。

下面，让我们以一个函数的创建和激活两个时期来讲解作用域链是如何创建和变化的。

## 函数创建

在《JavaScript深入之词法作用域和动态作用域》中讲到，函数的作用域在函数定义的时候就决定了。

这是因为函数有一个内部属性 [[scope]]，当函数创建的时候，就会保存所有父变量对象到其中，你可以理解 [[scope]] 就是所有父变量对象的层级链，但是注意：[[scope]] 并不代表完整的作用域链！

举个例子：

```js
function foo() {
    function bar() {
        ...
    }
}
```

函数创建时，各自的[[scope]]为：

```js
foo.[[scope]] = [
  globalContext.VO
];

bar.[[scope]] = [
    fooContext.AO,
    globalContext.VO
];
```

## 函数激活

当函数激活时，进入函数上下文，创建 VO/AO 后，就会将活动对象添加到作用链的前端。

这时候执行上下文的作用域链，我们命名为 Scope：

```js
Scope = [AO].concat([[Scope]]);
```

至此，作用域链创建完毕。

## 捋一捋

以下面的例子为例，结合着之前讲的变量对象和执行上下文栈，我们来总结一下函数执行上下文中作用域链和变量对象的创建过程：

```js
var scope = "global scope";
function checkscope() {
  var scope2 = "local scope";
  return scope2;
}
checkscope();
```

执行过程如下：

1.checkscope 函数被创建，保存作用域链到 内部属性[[scope]]

```js
checkscope.[[scope]] = [
    globalContext.VO
];
```

2.执行 checkscope 函数，创建 checkscope 函数执行上下文，checkscope 函数执行上下文被压入执行上下文栈

```js
ECStack = [checkscopeContext, globalContext];
```

3.checkscope 函数并不立刻执行，开始做准备工作，第一步：复制函数[[scope]]属性创建作用域链

```js
checkscopeContext = {
    Scope: checkscope.[[scope]],
}
```

4.第二步：用 arguments 创建活动对象，随后初始化活动对象，加入形参、函数声明、变量声明

```js
checkscopeContext = {
  AO: {
    arguments: {
      length: 0,
    },
    scope2: undefined,
  },
};
```

5.第三步：将活动对象压入 checkscope 作用域链顶端

```js
checkscopeContext = {
  AO: {
    arguments: {
      length: 0,
    },
    scope2: undefined,
  },
  Scope: [AO, [[Scope]]],
};
```

6.准备工作做完，开始执行函数，随着函数的执行，修改 AO 的属性值

```js
checkscopeContext = {
  AO: {
    arguments: {
      length: 0,
    },
    scope2: "local scope",
  },
  Scope: [AO, [[Scope]]],
};
```

7.查找到 scope2 的值，返回后函数执行完毕，函数上下文从执行上下文栈中弹出

```js
ECStack = [globalContext];
```

## 作用域链的实际应用

理解作用域链后，我们就能更好地理解一些常见的 JavaScript 现象。让我举几个实际开发中经常会遇到的例子：

### 变量遮蔽

```js
var name = "global";

function showName() {
  var name = "local";
  console.log(name); // "local"
}

showName();
console.log(name); // "global"
```

这个例子中，内层作用域的 `name` 变量遮蔽了外层作用域的同名变量。这在开发中既是特性也是坑点，一不小心就会用到错误的变量。

### 闭包中的变量访问

```js
function createCounter() {
  var count = 0;

  return function () {
    return ++count;
  };
}

var counter = createCounter();
console.log(counter()); // 1
console.log(counter()); // 2
```

为什么 `count` 变量在 `createCounter` 执行完后还能被访问？正是因为返回的函数保持了对外层作用域的引用，这就是闭包的核心。

### 模块模式的实现

```js
var module = (function () {
  var privateVar = "私密变量";

  function privateMethod() {
    console.log(privateVar);
  }

  return {
    publicMethod: function () {
      privateMethod();
    },
  };
})();

module.publicMethod(); // 可以访问
// privateMethod() // 报错，无法访问
```

这是很多模块化工具的基础原理，通过作用域链实现了变量的私有化。

### 性能优化建议

理解作用域链后，我们可以做一些性能优化：

```js
// 不好的做法
function process(list) {
  for (var i = 0; i < list.length; i++) {
    // 每次循环都要沿作用域链查找 list
    doSomething(list[i]);
  }
}

// 好的做法：将频繁访问的外层变量缓存到局部
function process(list) {
  var len = list.length; // 缓存
  for (var i = 0; i < len; i++) {
    doSomething(list[i]);
  }
}
```

虽然现代 JS 引擎已经做了很多优化，但在处理复杂循环时，这种优化依然有用。

## 总结

作用域链的核心其实很简单：

1. **函数定义时**：确定 [[scope]]，保存父级作用域引用
2. **函数调用时**：创建活动对象 AO，加入到作用域链顶端
3. **变量查找时**：沿作用域链从内向外查找

理解作用域链是掌握 JavaScript 的关键，它帮助我们理解闭包、模块化、变量查找等核心概念。希望这篇文章能让你对作用域链有更深入的理解。
