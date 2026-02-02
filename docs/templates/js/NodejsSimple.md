## 一、基础使用题：Koa 和 Egg.js 的核心区别是什么？你在项目中如何选型？

答：核心区别主要体现在框架定位、功能封装、使用规范三个方面，具体如下：

1. 框架定位不同：Koa 是轻量级 Node.js Web 框架，由 Express 原班人马开发，核心只提供洋葱模型的中间件机制，无任何多余内置功能，定位是“极简内核+灵活扩展”，属于基础框架；Egg.js 是基于 Koa 二次封装的企业级 Web 框架，定位是“标准化、高可用”，解决 Koa 生态零散、团队协作无规范的问题，属于上层应用框架。

2. 功能封装不同：Koa 无内置路由、控制器、配置管理、插件体系等，需手动集成第三方库（如 koa-router、koa-bodyparser），自由度极高，但开发需自行搭建基础架构；Egg.js 遵循“约定优于配置”，内置了路由、控制器、服务、配置隔离、插件机制、日志、异常处理等完整功能，无需手动搭建基础架构，开箱即用。

3. 使用规范不同：Koa 无固定开发规范，开发者可根据需求自由定义项目结构，适合个人或小团队灵活开发，但多人协作时易出现结构混乱；Egg.js 制定了统一的项目规范（如目录结构、代码规范、配置规范），强制团队遵循统一标准，降低协作成本，适合中大型团队和长期维护的项目。

项目选型原则（八股固定表述）：

1. 小型项目、简单接入层接口、个人开发或定制化需求较高的场景，优先选 Koa；其极简内核可减少冗余代码，灵活扩展特性能精准匹配定制化需求，开发效率高、学习成本低。

2. 中大型项目、多团队协作、接入层服务需长期维护、追求标准化开发的场景，优先选 Egg.js；其内置规范和完整功能可降低团队协作成本，减少架构搭建时间，提升项目可维护性和稳定性，同时插件体系能满足复杂业务的扩展需求。

## 二、实践题：在 Node.js 接入层中，如何从技术层面保障系统安全？

答：在 Node.js 接入层，保障系统安全需从请求校验、权限控制、攻击防护、日志监控、依赖管理五个核心维度入手，每个维度均有明确的技术实现方案，具体如下：

1.  请求校验：所有前端传入的请求参数，在接入层统一做严格校验，包括参数类型、长度、格式、必填项，禁止非法参数传入后端服务；可使用 joi、parameter 等校验库，避免参数注入（如 SQL 注入、XSS 注入），从源头拦截不安全请求。

2.  权限控制：基于 RBAC 权限模型，在接入层中间件中实现接口级权限校验，校验用户 Token 有效性、用户角色与接口权限的匹配度，无权限则直接拦截请求，返回 403 禁止访问；同时对敏感接口（如修改密码、删除数据），额外增加二次校验（如验证码、密码确认），提升安全性。

3.  攻击防护：针对常见 Web 安全漏洞，在接入层做针对性防护：① 防 XSS 攻击：对后端返回数据和用户输入做转义处理，配置 CSP 内容安全策略，限制脚本加载来源，开启 HttpOnly Cookie 禁止 JS 读取敏感 Cookie；② 防 CSRF 攻击：所有 POST 请求强制校验 CSRF Token，结合 Referer/Origin 校验，防止跨站伪造请求；③ 防暴力攻击：使用 rate-limit 等工具实现 IP 限流、接口访问频次限流，限制单 IP 单位时间内的请求次数，避免接口被刷；④ 防点击劫持：配置 X-Frame-Options 响应头，禁止页面被非法 iframe 嵌套。

4.  日志监控：在接入层统一记录所有请求日志，包括请求 IP、请求参数、响应结果、接口耗时、操作行为，同时记录异常日志（如请求失败、权限拦截、攻击行为），定期排查日志，及时发现安全隐患；配置日志告警机制，当出现异常请求频次过高、敏感接口被非法访问时，及时触发告警，快速响应处理。

5.  依赖管理：定期扫描 Node.js 项目的第三方依赖包，使用 npm audit、snyk 等工具检测依赖漏洞，及时更新修复高危依赖；禁止引入来源不明、无维护的依赖包，减少依赖漏洞带来的安全风险；同时配置项目依赖锁文件（package-lock.json），确保开发、测试、生产环境依赖版本一致，避免版本差异引发的安全问题。

## 三、基础题：洋葱模型是什么？

答：洋葱模型是 Koa 框架的核心中间件执行机制，也是 Node.js 接入层开发中核心的中间件运行模式，因其执行流程类似洋葱“从外到内进入，再从内到外退出”而得名，具体定义、执行流程、核心特点如下：

1.  核心定义：洋葱模型基于 async/await 语法实现，将多个中间件按顺序组成一个执行链，请求到来时，中间件会按顺序“从外到内”执行每一个中间件的 next() 之前的逻辑；当执行到最后一个中间件且无 next() 时，请求会“从内到外”逆序执行每一个中间件的 next() 之后的逻辑，形成闭环的执行流程，这就是洋葱模型。

2.  执行流程（八股固定表述）：

① 假设存在 3 个中间件 A、B、C，按顺序注册（A→B→C）；

② 请求进入后，先执行中间件 A 的 next() 之前的逻辑，执行到 next() 时，暂停 A 的执行，进入中间件 B；

③ 执行中间件 B 的 next() 之前的逻辑，执行到 next() 时，暂停 B 的执行，进入中间件 C；

④ 执行中间件 C 的 next() 之前的逻辑（若 C 无 next()），则 C 的前逻辑执行完毕，开始逆序返回；

⑤ 先执行中间件 C 的 next() 之后的逻辑，执行完毕后，回到中间件 B，执行 B 的 next() 之后的逻辑；

⑥ B 的后逻辑执行完毕后，回到中间件 A，执行 A 的 next() 之后的逻辑，最终完成整个请求的处理。

3.  核心特点：① 中间件执行顺序可控，先顺序执行前逻辑，再逆序执行后逻辑，形成闭环；② 支持中间件间的数据共享，可通过 ctx（上下文）对象，在多个中间件中传递数据、修改数据；③ 便于统一处理请求和响应，如在最外层中间件统一处理日志、跨域，在最内层中间件处理业务逻辑，实现职责分离；④ 基于 async/await，可完美处理异步逻辑，避免回调地狱，确保中间件执行顺序的一致性。

4.  实际应用：在 Node.js 接入层开发中，洋葱模型的典型应用包括：日志记录（前逻辑记录请求入参，后逻辑记录响应结果）、权限校验（前逻辑校验权限，无权限直接拦截，不执行后续中间件）、统一响应封装（后逻辑统一包装接口返回格式）、异常捕获（外层中间件捕获内层中间件的异步异常）。

## 1. React 和 Vue 的相同点和不同点（JS实现核心特性对比）

### 核心答案

#### 相同点

1. **数据驱动视图**：均基于MVVM思想（React为虚拟DOM+状态驱动，Vue为MVVM），通过数据变化自动更新视图，无需手动操作DOM；
2. **组件化开发**：均支持组件化，将页面拆分为独立可复用的组件，降低耦合度；
3. **虚拟DOM**：都使用虚拟DOM提升渲染性能，通过对比虚拟DOM差异更新真实DOM；
4. **生命周期**：组件均有生命周期钩子，可在不同阶段执行逻辑（如初始化、挂载、更新、销毁）；
5. **跨平台**：React可通过React Native开发原生应用，Vue可通过Vue Native/uni-app实现跨平台。

#### 不同点

| 维度       | React                                | Vue                                                       |
| ---------- | ------------------------------------ | --------------------------------------------------------- |
| 核心思想   | 函数式编程（推崇纯组件、单向数据流） | 渐进式框架（按需引入功能，更灵活）                        |
| 模板语法   | JSX（将HTML融入JS）                  | 模板语法（HTML+指令，如v-if/v-for）                       |
| 响应式原理 | 手动 setState 触发更新（不可变数据） | 基于Object.defineProperty（Vue2）/Proxy（Vue3）自动响应式 |
| 状态管理   | 需配合Redux/MobX（外部库）           | 内置Vuex/Pinia（官方适配）                                |
| 上手成本   | 较高（需理解JSX、函数式、hooks）     | 较低（模板语法接近原生HTML）                              |

#### 核心特性JS实现示例（对比）

**React 组件（函数式+JSX）**：

```jsx
import React, { useState } from "react";

// React组件：数据驱动视图（需手动setState）
function Counter() {
  // 声明状态，不可直接修改count，需通过setCount
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>计数：{count}</p>
      {/* 点击更新状态，触发视图重渲染 */}
      <button onClick={() => setCount(count + 1)}>加1</button>
    </div>
  );
}
```

**Vue 组件（模板语法+自动响应式）**：

```vue
<template>
  <!-- Vue模板语法 -->
  <div>
    <p>计数：{{ count }}</p>
    <button @click="count++">加1</button>
  </div>
</template>

<script>
export default {
  // Vue自动响应式数据
  data() {
    return {
      count: 0, // 可直接修改，自动触发视图更新
    };
  },
};
</script>
```

## 2. 302 怎么确定重定向路径？

### 核心答案

302 是HTTP临时重定向状态码，客户端（浏览器/Node.js）通过**响应头中的 Location 字段**确定重定向路径，完整流程和关键细节如下：

#### （1）核心逻辑

1. 客户端发送请求到服务器，服务器返回302状态码，并在响应头中携带 `Location: 目标路径`；
2. 客户端解析响应头的Location字段，自动向该路径发起新请求；
3. 若Location是**绝对路径**（如`https://xxx.com/api`），直接请求该地址；若为**相对路径**（如`/api`），则拼接原请求的域名/端口形成完整路径。

#### （2）Node.js中获取/设置302重定向路径示例

```javascript
// Koa框架中设置302重定向（服务器端）
const Koa = require("koa");
const app = new Koa();

app.use(async (ctx) => {
  if (ctx.path === "/old-path") {
    // 设置302状态码 + Location重定向路径
    ctx.status = 302;
    // 绝对路径
    ctx.set("Location", "https://xxx.com/new-path");
    // 相对路径（拼接原域名：如原请求是http://localhost:3000/old-path → http://localhost:3000/new-path）
    // ctx.set('Location', '/new-path');
  }
});

app.listen(3000);

// Node.js客户端请求302接口，获取重定向路径
const axios = require("axios");
axios
  .get("http://localhost:3000/old-path", {
    maxRedirects: 0, // 禁止自动重定向，便于获取Location
    validateStatus: (status) => status === 302, // 允许302状态码
  })
  .then((res) => {
    // 获取重定向路径
    const redirectPath = res.headers.location;
    console.log("重定向路径：", redirectPath); // 输出：https://xxx.com/new-path
  });
```

#### （3）关键注意点

- Location字段是302重定向的**唯一依据**，无该字段则客户端不会重定向；
- 302是临时重定向，浏览器不会缓存重定向路径；301（永久重定向）会缓存，需注意区分；
- 跨域场景下，若重定向路径跨域，客户端需确保该路径允许跨域（CORS配置）。

## 3. Promise(A).catch(f1).then(f2)，f1执行后f2会执行吗？为什么？

### 核心答案

**会执行**，核心原因是Promise的链式调用特性：`catch` 本身会返回一个新的resolved状态的Promise（除非f1内部抛出异常），因此后续的`then`会被触发。

#### （1）完整逻辑

1. Promise(A)若rejected，执行f1（catch回调）；
2. f1执行完成后，catch返回一个**状态为resolved、值为f1返回值**的新Promise；
3. 新Promise触发后续的then回调（f2）；
4. 仅当f1内部抛出异常（如`throw new Error()`），catch返回的Promise状态为rejected，f2才不会执行（需额外catch捕获）。

#### （2）代码验证

```javascript
// 示例1：f1执行后f2执行
Promise.reject("出错了")
  .catch((err) => {
    console.log("f1执行：", err); // 输出：f1执行：出错了
    return "f1返回值"; // catch返回resolved状态的Promise
  })
  .then((res) => {
    console.log("f2执行：", res); // 输出：f2执行：f1返回值
  });

// 示例2：f1抛异常，f2不执行
Promise.reject("出错了")
  .catch((err) => {
    console.log("f1执行：", err); // 输出：f1执行：出错了
    throw new Error("f1内部出错"); // catch返回rejected状态的Promise
  })
  .then((res) => {
    console.log("f2执行：", res); // 不执行
  })
  .catch((err) => {
    console.log("捕获f1异常：", err.message); // 输出：捕获f1异常：f1内部出错
  });
```

#### （3）核心总结

Promise链式调用中，`catch` 是`then(null, f1)`的语法糖，其返回值决定后续then是否执行：

- f1正常执行（无抛错）→ catch返回resolved → f2执行；
- f1抛错 → catch返回rejected → f2不执行（需后续catch捕获）。

## 4. JS对象数组转树形结构（coding题）

### 核心需求

将扁平的对象数组（含id、parentId字段）转为树形结构（子节点嵌套在children数组中）。

#### （1）完整实现代码

```javascript
/**
 * 扁平数组转树形结构
 * @param {Array} list - 扁平对象数组（含id、parentId字段）
 * @param {String|Number} rootId - 根节点的parentId（通常为0/null/''）
 * @returns {Array} 树形结构数组
 */
function arrayToTree(list, rootId = 0) {
  // 1. 创建id到节点的映射表，方便快速查找父节点
  const nodeMap = new Map();
  // 2. 初始化结果数组（存储根节点）
  const tree = [];

  // 第一步：遍历数组，构建映射表，初始化children
  for (const node of list) {
    nodeMap.set(node.id, { ...node, children: [] });
  }

  // 第二步：遍历数组，将子节点挂载到父节点的children中
  for (const node of list) {
    const currentNode = nodeMap.get(node.id);
    // 根节点直接加入结果
    if (node.parentId === rootId) {
      tree.push(currentNode);
    } else {
      // 非根节点，找到父节点并挂载
      const parentNode = nodeMap.get(node.parentId);
      if (parentNode) {
        parentNode.children.push(currentNode);
      }
    }
  }

  return tree;
}

// 测试用例
const flatList = [
  { id: 1, name: "一级节点1", parentId: 0 },
  { id: 2, name: "一级节点2", parentId: 0 },
  { id: 3, name: "二级节点1", parentId: 1 },
  { id: 4, name: "三级节点1", parentId: 3 },
  { id: 5, name: "二级节点2", parentId: 2 },
];

// 转换调用
const treeData = arrayToTree(flatList);
console.log(JSON.stringify(treeData, null, 2));
```

#### （2）输出结果

```json
[
  {
    "id": 1,
    "name": "一级节点1",
    "parentId": 0,
    "children": [
      {
        "id": 3,
        "name": "二级节点1",
        "parentId": 1,
        "children": [
          {
            "id": 4,
            "name": "三级节点1",
            "parentId": 3,
            "children": []
          }
        ]
      }
    ]
  },
  {
    "id": 2,
    "name": "一级节点2",
    "parentId": 0,
    "children": [
      {
        "id": 5,
        "name": "二级节点2",
        "parentId": 2,
        "children": []
      }
    ]
  }
]
```

#### （3）核心思路

1. **映射表优化**：用Map存储id与节点的映射，将查找父节点的时间复杂度从O(n)降为O(1)；
2. **两步遍历**：第一步初始化节点和映射表，第二步挂载子节点到父节点；
3. **鲁棒性**：判断父节点是否存在，避免无效节点导致的报错。

## 5. 比较两个版本号version1和version2（coding题）

### 核心需求

版本号格式为`x.y.z`（x、y、z为非负整数，可省略后续段，如1.0=1.0.0），比较规则：

- version1 > version2 → 返回1；
- version1 < version2 → 返回-1；
- 相等 → 返回0。

#### （1）完整实现代码

```javascript
/**
 * 比较两个版本号
 * @param {String} version1 - 版本号1
 * @param {String} version2 - 版本号2
 * @returns {Number} 1/-1/0
 */
function compareVersion(version1, version2) {
  // 1. 分割版本号为数组，转为数字
  const v1Arr = version1.split(".").map(Number);
  const v2Arr = version2.split(".").map(Number);
  // 2. 取最长长度，不足补0
  const maxLen = Math.max(v1Arr.length, v2Arr.length);

  for (let i = 0; i < maxLen; i++) {
    // 不足的段补0（如1.0 → [1,0,0]，1 → [1,0,0]）
    const v1 = i < v1Arr.length ? v1Arr[i] : 0;
    const v2 = i < v2Arr.length ? v2Arr[i] : 0;

    if (v1 > v2) return 1;
    if (v1 < v2) return -1;
  }

  // 所有段相等
  return 0;
}

// 测试用例
console.log(compareVersion("1.0.1", "1.0.0")); // 1
console.log(compareVersion("1.0", "1.0.0")); // 0
console.log(compareVersion("0.1", "1.1")); // -1
console.log(compareVersion("1.1.0", "1.0.9")); // 1
console.log(compareVersion("1.2", "1.10")); // -1
```

#### （2）核心思路

1. **分割与类型转换**：将版本号按`.`分割为数组，转为数字（避免字符串比较如'10'<'2'的问题）；
2. **补0对齐**：对长度不足的版本段补0，确保每一位都能比较；
3. **逐位比较**：从左到右逐位对比，一旦出现差异立即返回结果，全部相等则返回0。

## 6. 给定一个区间集合，合并所有重叠的区间（coding题）

### 核心需求

输入区间数组（如`[[1,3],[2,6],[8,10],[15,18]]`），合并重叠/相邻区间，输出`[[1,6],[8,10],[15,18]]`。

#### （1）完整实现代码

```javascript
/**
 * 合并重叠区间
 * @param {Array<Array<Number>>} intervals - 区间数组
 * @returns {Array<Array<Number>>} 合并后的区间数组
 */
function mergeIntervals(intervals) {
  // 边界处理：空数组直接返回
  if (intervals.length === 0) return [];

  // 1. 按区间左端点升序排序（核心前提）
  intervals.sort((a, b) => a[0] - b[0]);

  // 2. 初始化结果数组，放入第一个区间
  const merged = [intervals[0]];

  // 3. 遍历剩余区间，判断是否重叠
  for (let i = 1; i < intervals.length; i++) {
    const last = merged[merged.length - 1]; // 结果中最后一个区间
    const current = intervals[i];

    // 重叠：合并区间（更新右端点为最大值）
    if (current[0] <= last[1]) {
      last[1] = Math.max(last[1], current[1]);
    } else {
      // 不重叠：加入结果数组
      merged.push(current);
    }
  }

  return merged;
}

// 测试用例
const intervals = [
  [1, 3],
  [2, 6],
  [8, 10],
  [15, 18],
];
console.log(mergeIntervals(intervals)); // [[1,6],[8,10],[15,18]]

const intervals2 = [
  [1, 4],
  [4, 5],
];
console.log(mergeIntervals(intervals2)); // [[1,5]]
```

#### （2）核心思路

1. **排序是前提**：先按区间左端点升序排序，确保后续只需对比当前区间与结果最后一个区间；
2. **重叠判断**：当前区间左端点 ≤ 结果最后一个区间的右端点 → 重叠，合并右端点为两者最大值；
3. **边界处理**：空数组直接返回，单个区间无需合并。

### 总结

1. **React/Vue核心差异**：React侧重函数式、JSX、手动状态更新；Vue侧重渐进式、模板语法、自动响应式；
2. **Promise链式调用**：catch执行后f2默认执行（除非f1抛错），因catch返回resolved状态的Promise；
3. **编码题核心思路**：
   - 数组转树形：用Map构建映射表，两步遍历挂载子节点；
   - 版本号比较：分割补0后逐位对比；
   - 区间合并：先排序，再遍历合并重叠区间；
4. **302重定向**：核心依据是响应头Location字段，绝对/相对路径均需拼接为完整地址。
