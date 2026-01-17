---
title: JavaScript深入之执行上下文
description: JavaScript深入系列第七篇，结合之前所讲的四篇文章，以权威指南的demo为例，具体讲解当函数执行的时候，执行上下文栈、变量对象、作用域链是如何变化的。
created: 2024-01-01T00:00:00 (UTC + 08:00)
tags: [JavaScript]
category: 前端
---

# JavaScript深入之执行上下文

> JavaScript深入系列第七篇，结合之前所讲的四篇文章，以权威指南的demo为例，具体讲解当函数执行的时候，执行上下文栈、变量对象、作用域链是如何变化的。

## 前言

在《JavaScript深入之执行上下文栈》中讲到，当 JavaScript 代码执行一段可执行代码(executable code)时，会创建对应的执行上下文(execution contexts)。

对于每个执行上下文，都有三个重要属性：

- 变量对象(Variable object，VO)
- 作用域链(Scope chain)
- this

然后分别在《JavaScript深入之变量对象》、《JavaScript深入之作用域链》、《JavaScript深入之从ECMAScript规范解读this》中讲解了这三个属性。

阅读本文前，如果对以上的概念不是很清楚，希望先阅读这些文章。

因为，这一篇，我们会结合着所有内容，讲讲执行上下文的具体处理过程。

## 思考题

在《JavaScript深入之词法作用域和动态作用域》中，提出这样一道思考题：

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

两段代码都会打印'local scope'。虽然两段代码执行的结果一样，但是两段代码究竟有哪些不同呢？

紧接着就在下一篇《JavaScript深入之执行上下文栈》中，讲到了两者的区别在于执行上下文栈的变化不一样，然而，如果是这样笼统的回答，依然显得不够详细，本篇就会详细的解析执行上下文栈和执行上下文的具体变化过程。

## 具体执行分析

我们分析第一段代码：

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

执行过程如下：

1.执行全局代码，创建全局执行上下文，全局上下文被压入执行上下文栈

```js
ECStack = [globalContext];
```

2.全局上下文初始化

```js
globalContext = {
  VO: [global, scope, checkscope],
  Scope: [globalContext.VO],
  this: globalContext.VO,
};
```

2.初始化的同时，checkscope 函数被创建，保存作用域链到函数的内部属性[[scope]]

```js
    checkscope.[[scope]] = [
      globalContext.VO
    ];
```

3.执行 checkscope 函数，创建 checkscope 函数执行上下文，checkscope 函数执行上下文被压入执行上下文栈

```js
ECStack = [checkscopeContext, globalContext];
```

4.checkscope 函数执行上下文初始化：

1. 复制函数 [[scope]] 属性创建作用域链，
2. 用 arguments 创建活动对象，
3. 初始化活动对象，即加入形参、函数声明、变量声明，
4. 将活动对象压入 checkscope 作用域链顶端。

同时 f 函数被创建，保存作用域链到 f 函数的内部属性[[scope]]

```js
    checkscopeContext = {
        AO: {
            arguments: {
                length: 0
            },
            scope: undefined,
            f: reference to function f(){}
        },
        Scope: [AO, globalContext.VO],
        this: undefined
    }
```

5.执行 f 函数，创建 f 函数执行上下文，f 函数执行上下文被压入执行上下文栈

```js
ECStack = [fContext, checkscopeContext, globalContext];
```

6.f 函数执行上下文初始化, 以下跟第 4 步相同：

1. 复制函数 [[scope]] 属性创建作用域链
2. 用 arguments 创建活动对象
3. 初始化活动对象，即加入形参、函数声明、变量声明
4. 将活动对象压入 f 作用域链顶端

```js
fContext = {
  AO: {
    arguments: {
      length: 0,
    },
  },
  Scope: [AO, checkscopeContext.AO, globalContext.VO],
  this: undefined,
};
```

7.f 函数执行，沿着作用域链查找 scope 值，返回 scope 值

8.f 函数执行完毕，f 函数上下文从执行上下文栈中弹出

```js
ECStack = [checkscopeContext, globalContext];
```

9.checkscope 函数执行完毕，checkscope 执行上下文从执行上下文栈中弹出

```js
ECStack = [globalContext];
```

第二段代码就留给大家去尝试模拟它的执行过程。

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

不过，在下一篇《JavaScript深入之闭包》中也会提及这段代码的执行过程。

## 重要参考

[《一道js面试题引发的思考》](https://github.com/kuitos/kuitos.github.io/issues/18)

本文写的太好，给了我很多启发。感激不尽！
