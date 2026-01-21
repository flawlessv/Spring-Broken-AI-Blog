---
title: JavaScript深入之执行上下文完全指南
publishedAt: 2024-11-02
tags: [JavaScript]
category: 前端
slug: jsshangxaiwen
published: true
coverImage: https://pic1.imgdb.cn/item/696c6b3ccc965d6157f6b76b.jpg
---

# JavaScript深入之执行上下文完全指南

## 引言：真的是顺序执行吗？

谈到 JavaScript 代码的执行顺序，大多数开发者都会有一个直观的认识：代码是按顺序从上到下执行的。毕竟，下面这段代码的表现完全符合我们的预期：

```js
var foo = function () {
  console.log("foo1");
};

foo(); // foo1

var foo = function () {
  console.log("foo2");
};

foo(); // foo2
```

**第一段代码解释**：这里使用的是**函数表达式**。变量 `foo` 通过 `var` 声明，在执行上下文创建阶段被提升，但赋值操作发生在代码执行阶段。因此代码按顺序执行，第一次调用时 `foo` 指向第一个函数，第二次调用时指向第二个函数。

然而，当看到下面这段代码时，结果可能会让你感到意外：

```js
function foo() {
  console.log("foo1");
}

foo(); // foo2

function foo() {
  console.log("foo2");
}

foo(); // foo2
```

**第二段代码解释**：这里使用的是**函数声明**。在执行上下文创建阶段，函数声明会被完整提升（包括函数体），并且**后声明的函数会覆盖先声明的同名函数**。因此，当代码开始执行时，`foo` 已经指向第二个函数，两次调用的结果都是 `"foo2"`。

**两次调用都输出了 `foo2`**，这显然与"顺序执行"的直觉不符。

刷过面试题的都知道这是因为 JavaScript 引擎并非一行一行地分析和执行程序，而是一段一段地分析执行。当执行一段代码的时候，会进行一个"准备工作"，比如第一个例子中的变量提升，和第二个例子中的函数提升。

但是本文真正想让大家思考的是：这个"一段一段"中的"段"究竟是怎么划分的呢？

到底JavaScript引擎遇到一段怎样的代码时才会做"准备工作"呢？

## 可执行代码的类型

要回答上述问题，我们需要先了解 JavaScript 中**可执行代码(executable code)**的分类。实际上，JavaScript 的可执行代码只有三种类型：

1. **全局代码**(Global code)
2. **函数代码**(Function code)
3. **eval 代码**(Eval code)

当 JavaScript 引擎遇到上述任意一种代码时，就会进行"准备工作"。用更专业的术语来说，这个准备工作就是创建**执行上下文(execution context)**。

每个执行上下文都包含三个核心属性：

- **变量对象**(Variable object，VO)
- **作用域链**(Scope chain)
- **this 指向**

接下来我们将深入讲解这三个属性，以及执行上下文栈如何管理这些上下文。

## 执行上下文栈

在实际开发中，我们会编写大量的函数，这就产生了大量的执行上下文。如何高效地管理这些上下文呢？

JavaScript 引擎通过**执行上下文栈（Execution Context Stack，ECS）**来管理执行上下文的创建和销毁。

我们可以将执行上下文栈想象为一个数组：

```js
ECStack = [];
```

### 栈的初始化

当 JavaScript 开始解释执行代码时，首先遇到的就是全局代码。因此，初始化时会先向执行上下文栈压入一个**全局执行上下文**（用 `globalContext` 表示）。整个应用程序运行期间，全局执行上下文始终存在于栈底，只有当程序完全结束时才会被清空：

```js
ECStack = [globalContext];
```

### 函数调用时的栈变化

让我们通过一个具体的例子来理解执行上下文栈的工作机制：

```js
function fun3() {
  console.log("fun3");
}

function fun2() {
  fun3();
}

function fun1() {
  fun2();
}

fun1();
```

执行这段代码时，执行上下文栈的变化如下：

```js
// 1. 调用 fun1()，创建 fun1 的执行上下文并压入栈
ECStack.push(<fun1> functionContext);

// 2. fun1 中调用了 fun2()，创建 fun2 的执行上下文并压入栈
ECStack.push(<fun2> functionContext);

// 3. fun2 中调用了 fun3()，创建 fun3 的执行上下文并压入栈
ECStack.push(<fun3> functionContext);

// 4. fun3 执行完毕，其执行上下文从栈中弹出
ECStack.pop();

// 5. fun2 执行完毕，其执行上下文从栈中弹出
ECStack.pop();

// 6. fun1 执行完毕，其执行上下文从栈中弹出
ECStack.pop();

// 7. JavaScript 继续执行后续代码，但栈底永远保留 globalContext
```

这种**后进先出**(LIFO)的栈结构确保了函数调用的正确顺序和上下文的正确切换。

## 变量对象

现在让我们深入探讨执行上下文的第一个核心属性：**变量对象**。

**变量对象是与执行上下文相关的数据作用域**，它存储了在上下文中定义的变量和函数声明。由于不同类型的执行上下文存在差异，我们需要分别了解全局上下文和函数上下文中的变量对象。

### 全局上下文中的变量对象

要理解全局上下文的变量对象，首先需要了解**全局对象**的概念。

#### 什么是全局对象？

全局对象是预定义的对象，作为 JavaScript 全局函数和全局属性的占位符。通过全局对象，可以访问所有其他预定义的对象、函数和属性。

#### 全局对象的特性

1. **通过 this 引用**：在顶层 JavaScript 代码中，可以使用关键字 `this` 引用全局对象。在客户端 JavaScript 中，全局对象就是 `Window` 对象。

```js
console.log(this); // Window 对象
```

2. **由 Object 构造函数实例化**：全局对象是一个标准的 JavaScript 对象。

```js
console.log(this instanceof Object); // true
```

3. **预定义了丰富的函数和属性**：如 `Math`、`Date`、`setTimeout` 等。

```js
console.log(Math.random()); // 直接调用
console.log(this.Math.random()); // 通过全局对象调用
```

4. **作为全局变量的宿主**：所有全局变量都会成为全局对象的属性。

```js
var a = 1;
console.log(this.a); // 1
```

5. **拥有 window 属性指向自身**：在客户端 JavaScript 中，全局对象的 `window` 属性指向自身。

```js
var a = 1;
console.log(window.a); // 1

this.window.b = 2;
console.log(this.b); // 2
```

#### 结论

**全局上下文中的变量对象就是全局对象本身。**

### 函数上下文中的变量对象

在函数上下文中，我们使用**活动对象**(Activation Object，AO)来表示变量对象。

活动对象和变量对象本质上描述的是同一个概念，但存在细微区别：

- **变量对象**：规范层面的概念，是引擎实现的抽象，在 JavaScript 环境中无法直接访问
- **活动对象**：当进入执行上下文时，变量对象被"激活"，此时的变量对象被称为活动对象

**只有被激活的变量对象（即活动对象）上的属性才能被访问。**

活动对象在进入函数上下文时被创建，并通过函数的 `arguments` 属性进行初始化。

## 执行上下文的两个阶段

执行上下文的代码处理分为两个阶段：

1. **进入执行上下文**（创建阶段）
2. **代码执行**（执行阶段）

### 阶段一：进入执行上下文

当进入执行上下文时，代码尚未开始执行，此时变量对象会包含以下内容：

1. **函数的所有形参**（如果是函数上下文）
   - 由名称和对应值组成变量对象的属性
   - 如果没有传入实参，属性值设为 `undefined`

2. **函数声明**
   - 由名称和对应值（函数对象）组成变量对象的属性
   - 如果变量对象已存在同名属性，则**完全替换**该属性

3. **变量声明**
   - 由名称和对应值（`undefined`）组成变量对象的属性
   - 如果变量名与已声明的形参或函数相同，则**变量声明不会干扰**已存在的属性

#### 示例分析

```js
function foo(a) {
  var b = 2;
  function c() {}
  var d = function () {};

  b = 3;
}

foo(1);
```

在进入执行上下文后（代码执行前），活动对象的状态为：

```js
AO = {
  arguments: {
    0: 1,
    length: 1
  },
  a: 1,           // 形参
  b: undefined,   // 变量声明（初始值为 undefined）
  c: reference to function c(){}, // 函数声明
  d: undefined    // 变量声明（函数表达式也是变量）
}
```

### 阶段二：代码执行

在代码执行阶段，引擎会按顺序执行代码，并根据执行结果修改变量对象的值。

继续上面的例子，当代码执行完毕后，活动对象的状态变为：

```js
AO = {
  arguments: {
    0: 1,
    length: 1
  },
  a: 1,
  b: 3, // b 被赋值为 3
  c: reference to function c(){},
  d: reference to FunctionExpression "d" // d 被赋值为函数表达式
}
```

### 执行过程总结

1. 全局上下文的变量对象初始化为全局对象
2. 函数上下文的变量对象初始化只包括 Arguments 对象
3. 进入执行上下文时，添加形参、函数声明、变量声明等初始属性
4. 代码执行阶段，根据代码执行结果修改变量对象的属性值

## 作用域链

执行上下文的第二个核心属性是**作用域链**。

### 什么是作用域链？

当查找变量时，JavaScript 引擎会按照以下顺序查找：

1. 从当前上下文的变量对象中查找
2. 如果未找到，从父级执行上下文（词法层面）的变量对象中查找
3. 依此类推，直到全局上下文的变量对象（即全局对象）

这种由多个执行上下文的变量对象构成的链表结构就是**作用域链**。

### 函数创建时的作用域链

函数的作用域在**函数定义时**就已经确定了。

这是因为函数有一个内部属性 `[[scope]]`，当函数被创建时，会保存所有父变量对象的引用。我们可以将 `[[scope]]` 理解为所有父变量对象的层级链。

**注意**：`[[scope]]` 并不代表完整的作用域链！

#### 示例

```js
function foo() {
  function bar() {
    // ...
  }
}
```

函数创建时，各自的 `[[scope]]` 属性为：

```js
foo.[[scope]] = [
  globalContext.VO
];

bar.[[scope]] = [
  fooContext.AO,
  globalContext.VO
];
```

### 函数激活时的作用域链

当函数被激活（调用）时，进入函数上下文，创建 VO/AO 后，会将活动对象添加到作用域链的前端。

此时执行上下文的作用域链（命名为 `Scope`）为：

```js
Scope = [AO].concat([[Scope]]);
```

至此，完整的作用域链创建完成。

## 思考题深度解析

在《JavaScript深入之词法作用域和动态作用域》中，提出了这样一道经典思考题：

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

两段代码都会输出 `'local scope'`，虽然执行结果相同，但它们的执行过程存在重要差异。

### 第一段代码的详细执行过程

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

执行步骤分析：

**步骤 1**：执行全局代码，创建全局执行上下文，压入执行上下文栈

```js
ECStack = [globalContext];
```

**步骤 2**：全局上下文初始化

```js
globalContext = {
  VO: [global, scope, checkscope],
  Scope: [globalContext.VO],
  this: globalContext.VO,
};
```

**步骤 3**：`checkscope` 函数被创建，保存作用域链到内部属性 `[[scope]]`

```js
checkscope.[[scope]] = [
  globalContext.VO
];
```

**步骤 4**：执行 `checkscope` 函数，创建其执行上下文并压入栈

```js
ECStack = [checkscopeContext, globalContext];
```

**步骤 5**：`checkscope` 函数执行上下文初始化

- 复制函数 `[[scope]]` 属性创建作用域链
- 用 `arguments` 创建活动对象
- 初始化活动对象（加入形参、函数声明、变量声明）
- 将活动对象压入作用域链顶端

同时，`f` 函数被创建，保存作用域链到其内部属性 `[[scope]]`

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

f.[[scope]] = [
  checkscopeContext.AO,
  globalContext.VO
];
```

**步骤 6**：执行 `f` 函数，创建其执行上下文并压入栈

```js
ECStack = [fContext, checkscopeContext, globalContext];
```

**步骤 7**：`f` 函数执行上下文初始化

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

**步骤 8**：`f` 函数执行，沿作用域链查找 `scope` 值并返回

**步骤 9**：`f` 函数执行完毕，其上下文从栈中弹出

```js
ECStack = [checkscopeContext, globalContext];
```

**步骤 10**：`checkscope` 函数执行完毕，其上下文从栈中弹出

```js
ECStack = [globalContext];
```

### 第二段代码的执行过程

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

执行上下文栈的变化：

```js
// 1. 进入 checkscope 函数
ECStack.push(<checkscope> functionContext);

// 2. checkscope 执行完毕，返回 f 函数
ECStack.pop();

// 3. 执行 f 函数
ECStack.push(<f> functionContext);

// 4. f 函数执行完毕
ECStack.pop();
```

### 关键区别

第二段代码中，`checkscope` 函数执行完毕后，其执行上下文立即从栈中弹出，然后再执行 `f` 函数。

而在第一段代码中，`f` 函数是在 `checkscope` 函数内部执行的，因此 `checkscope` 的执行上下文始终保留在栈中，直到 `f` 函数执行完毕。

这就是两段代码虽然结果相同，但执行过程不同的根本原因。

## 进阶思考题

### 第一题：变量声明的时机

```js
function foo() {
  console.log(a);
  a = 1;
}

foo(); // ???

function bar() {
  a = 1;
  console.log(a);
}
bar(); // ???
```

**答案**：

- 第一段代码报错：`Uncaught ReferenceError: a is not defined`
- 第二段代码输出：`1`

**解析**：

第一段代码中，`a` 没有通过 `var` 关键字声明，因此不会被存放在 AO 中。

执行 `console.log(a)` 时，AO 的状态为：

```js
AO = {
  arguments: {
    length: 0,
  },
};
```

AO 中没有 `a`，引擎会沿作用域链向全局查找，全局也没有 `a`，因此报错。

第二段代码中，执行 `console.log(a)` 时，`a` 已经被赋值为全局对象的属性，因此可以从全局找到 `a` 的值，输出 `1`。

### 第二题：函数声明与变量声明

```js
console.log(foo);

function foo() {
  console.log("foo");
}

var foo = 1;
```

**答案**：输出函数对象，而不是 `undefined`。

**解析**：

在进入执行上下文时，处理顺序如下：

1. 首先处理函数声明
2. 然后处理变量声明
3. 如果变量名与已声明的形参或函数相同，变量声明**不会干扰**已存在的属性

因此，`foo` 最终保持为函数声明，而非 `undefined`。

## 总结

通过本文的深入学习，我们全面掌握了 JavaScript 执行上下文的完整机制：

### 核心概念

1. **执行上下文栈**：管理多个执行上下文的栈结构，全局执行上下文永远位于栈底
2. **变量对象**：存储执行上下文中定义的变量和函数声明
   - 全局上下文：变量对象就是全局对象
   - 函数上下文：使用活动对象(AO)表示变量对象
3. **作用域链**：由多个执行上下文的变量对象构成的链表，用于变量查找
4. **执行过程**：分为进入执行上下文和代码执行两个阶段

### 实际应用

理解这些概念对于掌握 JavaScript 的运行机制至关重要，它们是理解以下高级概念的基础：

- **闭包**：作用域链的实际应用
- **this 指向**：执行上下文的动态绑定
- **变量提升**：执行上下文创建阶段的表现
- **块级作用域**：ES6+ let/const 与变量对象的交互

掌握执行上下文的工作原理，将帮助你更好地理解 JavaScript 代码的执行过程，编写更可预测、更健壮的代码。
