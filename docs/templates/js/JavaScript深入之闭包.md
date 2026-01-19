---
title: JavaScript深入之闭包
publishedAt: 2024-11-03
tags: [JavaScript]
slug: jsbibao
published: true
category: 前端
coverImage: https://pic1.imgdb.cn/item/696c6b3dcc965d6157f6b770.jpg
---

# JavaScript深入之闭包

闭包是 JavaScript 中最核心也最容易混淆的概念之一。实际开发中经常用到，但很多人只是会用，不理解原理。今天我想从理论和实践两个角度，帮你彻底搞懂闭包。

## 定义

MDN 对闭包的定义为：

> 闭包是指那些能够访问自由变量的函数。

那什么是自由变量呢？

> 自由变量是指在函数中使用的，但既不是函数参数也不是函数的局部变量的变量。

由此，我们可以看出闭包共有两部分组成：

> 闭包 = 函数 + 函数能够访问的自由变量

举个例子：

```js
var a = 1;

function foo() {
  console.log(a);
}

foo();
```

foo 函数可以访问变量 a，但是 a 既不是 foo 函数的局部变量，也不是 foo 函数的参数，所以 a 就是自由变量。

那么，函数 foo + foo 函数访问的自由变量 a 不就是构成了一个闭包嘛……

还真是这样的！

所以在《JavaScript权威指南》中就讲到：从技术的角度讲，所有的JavaScript函数都是闭包。

咦，这怎么跟我们平时看到的讲到的闭包不一样呢！？

别着急，这是理论上的闭包，其实还有一个实践角度上的闭包，让我们看看汤姆大叔翻译的关于闭包的文章中的定义：

ECMAScript中，闭包指的是：

1. 从理论角度：所有的函数。因为它们都在创建的时候就将上层上下文的数据保存起来了。哪怕是简单的全局变量也是如此，因为函数中访问全局变量就相当于是在访问自由变量，这个时候使用最外层的作用域。
2. 从实践角度：以下函数才算是闭包：
   1. 即使创建它的上下文已经销毁，它仍然存在（比如，内部函数从父函数中返回）
   2. 在代码中引用了自由变量

接下来就来讲讲实践上的闭包。

## 分析

让我们先写个例子，例子依然是来自《JavaScript权威指南》，稍微做点改动：

```js
var scope = "global scope";
function checkscope() {
  var scope = "local scope";
  function f() {
    return scope;
  }
  return f;
}

var foo = checkscope();
foo();
```

首先我们要分析一下这段代码中执行上下文栈和执行上下文的变化情况。

另一个与这段代码相似的例子，在《JavaScript深入之执行上下文》中有着非常详细的分析。如果看不懂以下的执行过程，建议先阅读这篇文章。

这里直接给出简要的执行过程：

1. 进入全局代码，创建全局执行上下文，全局执行上下文压入执行上下文栈
2. 全局执行上下文初始化
3. 执行 checkscope 函数，创建 checkscope 函数执行上下文，checkscope 执行上下文被压入执行上下文栈
4. checkscope 执行上下文初始化，创建变量对象、作用域链、this等
5. checkscope 函数执行完毕，checkscope 执行上下文从执行上下文栈中弹出
6. 执行 f 函数，创建 f 函数执行上下文，f 执行上下文被压入执行上下文栈
7. f 执行上下文初始化，创建变量对象、作用域链、this等
8. f 函数执行完毕，f 函数上下文从执行上下文栈中弹出

了解到这个过程，我们应该思考一个问题，那就是：

当 f 函数执行的时候，checkscope 函数上下文已经被销毁了啊(即从执行上下文栈中被弹出)，怎么还会读取到 checkscope 作用域下的 scope 值呢？

以上的代码，要是转换成 PHP，就会报错，因为在 PHP 中，f 函数只能读取到自己作用域和全局作用域里的值，所以读不到 checkscope 下的 scope 值。

然而 JavaScript 却是可以的！

当我们了解了具体的执行过程后，我们知道 f 执行上下文维护了一个作用域链：

```js
fContext = {
  Scope: [AO, checkscopeContext.AO, globalContext.VO],
};
```

对的，就是因为这个作用域链，f 函数依然可以读取到 checkscopeContext.AO 的值，说明当 f 函数引用了 checkscopeContext.AO 中的值的时候，即使 checkscopeContext 被销毁了，但是 JavaScript 依然会让 checkscopeContext.AO 活在内存中，f 函数依然可以通过 f 函数的作用域链找到它，正是因为 JavaScript 做到了这一点，从而实现了闭包这个概念。

所以，让我们再看一遍实践角度上闭包的定义：

1. 即使创建它的上下文已经销毁，它仍然存在（比如，内部函数从父函数中返回）
2. 在代码中引用了自由变量

在这里再补充一个《JavaScript权威指南》英文原版对闭包的定义:

> This combination of a function object and a scope (a set of variable bindings) in which the function's variables are resolved is called a closure in the computer science literature.

闭包在计算机科学中也只是一个普通的概念，大家不要去想得太复杂。

## 必刷题

接下来，看这道刷题必刷，面试必考的闭包题：

```js
var data = [];

for (var i = 0; i < 3; i++) {
  data[i] = function () {
    console.log(i);
  };
}

data[0]();
data[1]();
data[2]();
```

答案是都是 3，让我们分析一下原因：

当执行到 data[0] 函数之前，此时全局上下文的 VO 为：

```js
globalContext = {
    VO: {
        data: [...],
        i: 3
    }
}
```

当执行 data[0] 函数的时候，data[0] 函数的作用域链为：

```js
data[0]Context = {
    Scope: [AO, globalContext.VO]
}
```

data[0]Context 的 AO 并没有 i 值，所以会从 globalContext.VO 中查找，i 为 3，所以打印的结果就是 3。

data[1] 和 data[2] 是一样的道理。

所以让我们改成闭包看看：

```js
var data = [];

for (var i = 0; i < 3; i++) {
  data[i] = (function (i) {
    return function () {
      console.log(i);
    };
  })(i);
}

data[0]();
data[1]();
data[2]();
```

当执行到 data[0] 函数之前，此时全局上下文的 VO 为：

```js
globalContext = {
    VO: {
        data: [...],
        i: 3
    }
}
```

跟没改之前一模一样。

当执行 data[0] 函数的时候，data[0] 函数的作用域链发生了改变：

```js
data[0]Context = {
    Scope: [AO, 匿名函数Context.AO globalContext.VO]
}
```

匿名函数执行上下文的 AO 为：

```js
匿名函数Context = {
  AO: {
    arguments: {
      0: 0,
      length: 1,
    },
    i: 0,
  },
};
```

data[0]Context 的 AO 并没有 i 值，所以会沿着作用域链从匿名函数 Context.AO 中查找，这时候就会找 i 为 0，找到了就不会往 globalContext.VO 中查找了，即使 globalContext.VO 也有 i 的值(值为3)，所以打印的结果就是 0。

data[1] 和 data[2] 是一样的道理。

## 闭包的应用

理解闭包的原理之后，让我们看看在实际开发中闭包有哪些典型应用。

### 模拟私有变量

JavaScript 在 ES6 的 class 之前没有真正的私有变量概念，但我们可以通过闭包实现类似效果：

```js
function createPerson(name) {
  var _name = name; // 约定俗成，下划线开头表示"私有"

  return {
    getName: function () {
      return _name;
    },
    setName: function (newName) {
      _name = newName;
    },
  };
}

var person = createPerson("张三");
console.log(person.getName()); // "张三"
person.setName("李四");
console.log(person.getName()); // "李四"
console.log(person._name); // undefined，无法直接访问
```

这种方式创建的 `_name` 变量只能通过暴露的方法访问，外部无法直接修改，实现了数据的封装。

### 柯里化（Currying）

闭包是实现柯里化的基础。柯里化是把接受多个参数的函数变换成接受一个单一参数的函数：

> 函数防抖与节流也是用的闭包

```js
function add(a) {
  return function (b) {
    return a + b;
  };
}

var add5 = add(5);
console.log(add5(3)); // 8
console.log(add5(10)); // 15
```

一个更实用的例子是创建配置好的函数：

```js
function makeAjax(url) {
  return function (data) {
    // 实际项目中这里是真实的 ajax 请求
    console.log("发送请求到 " + url);
    console.log("数据：" + JSON.stringify(data));
  };
}

var getUser = makeAjax("/api/user");
var getOrder = makeAjax("/api/order");

getUser({ id: 1 });
getOrder({ orderId: 100 });
```

### 命名空间与模块化

在 ES6 模块出现之前，常用闭包来实现模块化，避免全局变量污染：

```js
var myModule = (function () {
  var privateVar = "这是私有变量";

  function privateFunc() {
    console.log("这是私有函数");
  }

  return {
    publicVar: "这是公共变量",
    publicFunc: function () {
      console.log(privateVar);
      privateFunc();
    },
  };
})();

console.log(myModule.publicVar); // "这是公共变量"
myModule.publicFunc(); // 可以访问
// myModule.privateVar; // undefined
// myModule.privateFunc(); // 报错
```

### 偏函数

偏函数是指固定一个函数的一些参数，然后产生一个更小元的函数：

```js
// 通用绑定函数
function bind(fn, context) {
  return function () {
    return fn.apply(context, arguments);
  };
}

var obj = {
  name: "张三",
  getName: function () {
    return this.name;
  },
};

var boundGetName = bind(obj.getName, obj);
console.log(boundGetName()); // "张三"
```

### 缓存计算结果

通过闭包可以实现简单的缓存机制：

```js
function createCache() {
  var cache = {};

  return {
    get: function (key) {
      return cache[key];
    },
    set: function (key, value) {
      cache[key] = value;
    },
    has: function (key) {
      return key in cache;
    },
  };
}

var memo = createCache();

function fibonacci(n) {
  if (n <= 1) return n;

  if (memo.has(n)) {
    return memo.get(n);
  }

  var result = fibonacci(n - 1) + fibonacci(n - 2);
  memo.set(n, result);
  return result;
}
```

### 单例模式

闭包可以用来实现单例模式：

```js
function createSingleton() {
  var instance;

  function init() {
    var privateVar = 0;

    function privateMethod() {
      privateVar++;
      console.log(privateVar);
    }

    return {
      publicMethod: privateMethod,
    };
  }

  return {
    getInstance: function () {
      if (!instance) {
        instance = init();
      }
      return instance;
    },
  };
}

var singleton = createSingleton();

var instance1 = singleton.getInstance();
var instance2 = singleton.getInstance();

console.log(instance1 === instance2); // true
```

## 注意事项

虽然闭包很强大，但也有一些需要注意的地方：

### 内存问题

闭包会引用父函数的变量，导致这些变量无法被垃圾回收：

```js
function createElements() {
  var arr = [];

  for (var i = 0; i < 1000; i++) {
    arr[i] = function () {
      console.log(i);
    };
  }

  return arr;
}

var elements = createElements();
// 即使只用到了 elements[0]，但其他 999 个函数的闭包也都会保留在内存中
```

解决方案是用完就置空：

```js
elements = null; // 解除引用
```

### 性能考虑

闭包涉及跨作用域访问，比直接访问局部变量要慢：

```js
// 更快的做法
function process(list) {
  var len = list.length; // 缓存到局部变量
  for (var i = 0; i < len; i++) {
    // 使用 list
  }
}
```

## 总结

闭包是 JavaScript 中最重要的概念之一：

1. **理论上**：所有函数都是闭包，因为它们都能访问自由变量
2. **实践上**：当函数可以记住并访问所在的词法作用域，即使函数是在当前词法作用域之外执行，就产生了闭包

闭包的应用非常广泛：

- 数据封装和私有变量
- 柯里化和偏函数
- 防抖和节流
- 模块化
- 缓存和单例模式

理解闭包需要结合执行上下文、作用域链、变量对象等知识，建议结合《JavaScript深入之执行上下文》和《JavaScript深入之作用域》这两篇文章一起阅读。

闭包既是 JavaScript 的难点，也是精妙之处。掌握闭包，才能算是真正理解了 JavaScript。
