---
title: JavaScript深入之作用域完全指南
description: JavaScript深入系列，深入讲解作用域的概念，包括词法作用域、动态作用域和作用域链，帮助你全面理解JavaScript的作用域机制。
created: 2024-01-01T00:00:00 (UTC +08:00)
tags: [JavaScript]
category: 前端
slug: jszuoyongyu
published: true
coverImage: https://pic1.imgdb.cn/item/696c6e52cc965d6157f6c039.jpg
---

# JavaScript深入之作用域完全指南

作用域是指程序源代码中定义变量的区域。

作用域规定了如何查找变量，也就是确定当前执行代码对变量的访问权限。

JavaScript 采用词法作用域(lexical scoping)，也就是静态作用域。

## 静态作用域与动态作用域

因为 JavaScript 采用的是词法作用域，函数的作用域在函数定义的时候就决定了。

而与词法作用域相对的是动态作用域，函数的作用域是在函数调用的时候才决定的。

让我们认真看个例子就能明白之间的区别：

```js
var value = 1;

function foo() {
  console.log(value);
}

function bar() {
  var value = 2;
  foo();
}

bar();

// 结果是 ???
```

假设JavaScript采用静态作用域，让我们分析下执行过程：

执行 foo 函数，先从 foo 函数内部查找是否有局部变量 value，如果没有，就根据书写的位置，查找上面一层的代码，也就是 value 等于 1，所以结果会打印 1。

假设JavaScript采用动态作用域，让我们分析下执行过程：

执行 foo 函数，依然是从 foo 函数内部查找是否有局部变量 value。如果没有，就从调用函数的作用域，也就是 bar 函数内部查找 value 变量，所以结果会打印 2。

前面我们已经说了，JavaScript采用的是静态作用域，所以这个例子的结果是 1。

## 动态作用域

也许你会好奇什么语言是动态作用域？

bash 就是动态作用域，不信的话，把下面的脚本存成例如 scope.bash，然后进入相应的目录，用命令行执行 `bash ./scope.bash`，看看打印的值是多少。

```bash
value=1
function foo () {
    echo $value;
}
function bar () {
    local value=2;
    foo;
}
bar
```

这个文件也可以在[github博客仓库](https://github.com/mqyqingfeng/Blog/blob/master/demos/scope/scope.bash)中找到。

## 思考题

最后，让我们看一个《JavaScript权威指南》中的例子：

```js
var scope = "global scope";
function checkscope() {
  var scope = "local scope";
  function f() {
    return scope;
  }
  return f();
}
checkscope();
```

```js
var scope = "global scope";
function checkscope() {
  var scope = "local scope";
  function f() {
    return scope;
  }
  return f;
}
checkscope()();
```

猜猜两段代码各自的执行结果是多少？

这里直接告诉大家结果，两段代码都会打印：`local scope`。

原因也很简单，因为JavaScript采用的是词法作用域，函数的作用域基于函数创建的位置。

而引用《JavaScript权威指南》的回答就是：

JavaScript 函数的执行用到了作用域链，这个作用域链是在函数定义的时候创建的。嵌套的函数 f() 定义在这个作用域链里，其中的变量 scope 一定是局部变量，不管何时何地执行函数 f()，这种绑定在执行 f() 时依然有效。

但是在这里真正想让大家思考的是：

虽然两段代码执行的结果一样，但是两段代码究竟有哪些不同呢？

如果要回答这个问题，就要牵涉到很多的内容，词法作用域只是其中的一小部分。接下来，让我们深入了解作用域链的机制。

## 作用域链

在之前的文章中，我们讲到当 JavaScript 代码执行一段可执行代码(executable code)时，会创建对应的执行上下文(execution context)。

对于每个执行上下文，都有三个重要属性：

- 变量对象(Variable object，VO)
- 作用域链(Scope chain)
- this

接下来我们重点讲讲作用域链。

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

理解作用域链是掌握 JavaScript 的关键，它帮助我们理解闭包、模块化、变量查找等核心概念。通过本文的学习，你应该对 JavaScript 的作用域机制有了更深入的理解，从词法作用域的基本概念，到作用域链的完整实现过程，再到实际开发中的应用场景。

词法作用域和作用域链是 JavaScript 基础中的重要概念，掌握好这些知识，将有助于你更好地理解 JavaScript 的工作原理，写出更加健壮和高效的代码。
