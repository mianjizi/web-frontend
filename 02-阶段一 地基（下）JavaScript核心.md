---
tags: [前端, JavaScript, 阶段一]
created: 2026-10-01
阶段: 1 地基（下）
主要参考: 现代 JavaScript 教程 · MDN JavaScript 指南 · ECMAScript 6 入门
---

# 阶段一 地基（下）JavaScript 核心

> 一句话：JS 只有**一个线程**，靠「事件循环」把异步任务排进队列来假装同时做事；理解这一点，`Promise`、`async/await`、所有"为什么它还没执行"的困惑都会自动解开。
> 主要参考：现代 JavaScript 教程（`zh.javascript.info`）、MDN JavaScript 指南、ECMAScript 6 入门（`es6.ruanyifeng.com`）。
> 时间预算：4 周。这四件事必须练到能徒手写：**闭包、`this`、原型、异步**。

## 1. 语言基本盘

### 1.1 类型

`number` `string` `boolean` `null` `undefined` `symbol` `bigint`（原始类型）+ `object`（含数组、函数）。

三个高频坑：

- `typeof null === "object"`（历史遗留 bug，记住即可）。
- `NaN !== NaN`，判空用 `Number.isNaN(x)`。
- 不要用 `==`。`==` 会做隐式类型转换（`"1" == 1` 为真），**只用 `===`**。

### 1.2 变量

`const` 默认，需要重新赋值才 `let`，`var` **不要用**（函数级作用域 + 变量提升，是过去踩坑的根源）。
`const` 约束的是「绑定不可改」，对象内部属性照样能改——这不是 bug，是设计。

### 1.3 几个必背的运算

```js
// 可选链：中间某一层是 null/undefined 不会抛错，整体返回 undefined
user?.profile?.name

// 空值合并：只在 null/undefined 时取右边（区别于 || 会把 0、'' 也算假值）
const pageSize = input ?? 20

// 解构 + 展开
const { name, age = 18 } = user
const merged = { ...defaults, ...options }
const [first, ...rest] = list
```

`??` 与 `||` 的区别是高频面试题，也是真实 bug 来源（分页参数传 0 会被 `||` 吃掉）。

## 2. 作用域、闭包、this

### 2.1 作用域与提升

- 每个函数有自己的作用域；`{}` 在 `let/const` 下形成块级作用域。
- `let/const` 有**暂时性死区**：声明前访问报错（而不是 `undefined`）——这是好事，能提前暴露 bug。

### 2.2 闭包

**定义**：函数记住了它被定义时所在的那个作用域，即使外层函数已经执行完。

```js
function counter() {
  let n = 0            // 被闭包"关"在里面
  return () => ++n     // 返回的函数一直持有对 n 的引用
}
const next = counter()
next() // 1
next() // 2
```

用途：私有变量、函数工厂、防抖节流、React 的 `useEffect` 依赖问题（本质就是闭包捕获了旧值）。
代价：被闭包引用的变量不会被回收，长期持有大对象要留意。

### 2.3 this

四种绑定，按优先级判断：

| 调用方式 | `this` 指向 |
|---|---|
| `obj.fn()` | `obj` |
| `fn()` 裸调用 | 严格模式下 `undefined`，非严格是全局对象 |
| `fn.call(x)` / `fn.apply(x)` / `fn.bind(x)` | 被显式指定的 `x`（`bind` 返回新函数不可再改） |
| `new Fn()` | 新创建的实例 |
| 箭头函数 | **没有自己的 this**，取外层作用域的 this（所以回调里爱用箭头函数） |

口诀：**看调用的位置，不看定义的位置**；箭头函数反过来。

## 3. 原型与 class

```js
class Animal {
  constructor(name) { this.name = name }        // 实例属性
  speak() { return `${this.name} 发声` }         // 在 Animal.prototype 上，所有实例共享
}
class Dog extends Animal {
  speak() { return super.speak() + '：汪' }
}
```

要点：

- 实例属性在 `constructor` 里，**方法在原型上**——所以方法不要写成 `this.speak = () => {}`（那样每个实例都存一份，浪费）。
- `class` 只是原型继承的语法糖，原型链才是本体：读属性时沿 `__proto__` 往上找，找到为止，找不到是 `undefined`。
- 判断：`dog instanceof Animal`、`Object.getPrototypeOf(x)`。**不要手改 `__proto__`**。

## 4. 数组方法与函数式写法

| 方法 | 作用 | 是否改原数组 |
|---|---|---|
| `map` | 一对一转换，返回新数组 | 否 |
| `filter` | 筛选，返回新数组 | 否 |
| `reduce` | 聚合为一个值（求和、分组、计数） | 否 |
| `find` / `findIndex` | 找第一个匹配项 | 否 |
| `some` / `every` | 是否存在 / 是否全部 | 否 |
| `sort` | 排序（**原地修改**，且默认按字符串排，数字要传比较函数） | **是** |
| `reverse` / `splice` | **原地修改** | **是** |
| `slice` / `concat` / `toSorted` / `toReversed` | 非破坏性版本 | 否 |

```js
// sort 的数字陷阱：不传比较函数，[10, 9, 100] 会排成 [10, 100, 9]
list.toSorted((a, b) => a.score - b.score)
```

**`reduce` 是分水岭**：能熟练用它做"分组、去重、求和、扁平化"，说明数组这一关过了。

## 5. 异步（核心中的核心）

### 5.1 事件循环

```
同步代码 → 执行栈
异步回调 → 任务队列
         ├── 微任务队列（Promise.then、queueMicrotask）——每轮同步代码跑完就清空
         └── 宏任务队列（setTimeout、事件回调、网络回调）——轮到时取一个
```

**关键结论**：微任务优先于宏任务，且微任务队列会被**清空**才进入下一个宏任务。
所以下面这段输出顺序是 `1 3 4 2`：

```js
console.log(1)
setTimeout(() => console.log(2))          // 宏任务
Promise.resolve().then(() => console.log(4))  // 微任务
console.log(3)
```

能自己推导出这个顺序，异步就算入门了。

### 5.2 回调 → Promise → async/await

```js
// 回调地狱：嵌套层级随步骤线性增长，错误处理分散
getUser(id, (u) => getOrders(u, (o) => render(o)))

// Promise：把"未来会有的值"当成值来传递
getUser(id)
  .then(u => getOrders(u))
  .then(o => render(o))
  .catch(err => console.error(err))   // 一处兜住全链路的错

// async/await：Promise 的语法糖，写法像同步
async function load(id) {
  try {
    const u = await getUser(id)
    const o = await getOrders(u)
    render(o)
  } catch (err) { console.error(err) }
}
```

三个要点：

1. `await` 只能在 `async` 函数里用；`async` 函数**一定返回 Promise**。
2. **默认会"排队"执行**（上面两条 `await` 是串行的）。彼此无依赖的请求要并发：

```js
const [a, b] = await Promise.all([fetchA(), fetchB()])   // 一起发，都成功才继续
const results = await Promise.allSettled([f1(), f2()])   // 不因单个失败中断，逐个看成败
```

3. `Promise.all` 有一个失败就整体失败；要"部分成功也要结果"用 `allSettled`；要"最快那个"用 `race`。

### 5.3 fetch 与错误处理

```js
const res = await fetch('/api/items')
if (!res.ok) throw new Error(`HTTP ${res.status}`)   // fetch 只在网络故障时 reject
const data = await res.json()
```

**`fetch` 不会因为 404/500 而 reject**——这是最常见的误解，必须自己判 `res.ok`。

## 6. DOM 与事件

```js
const el = document.querySelector('.card')        // 返回第一个匹配
const all = document.querySelectorAll('.card')    // NodeList，可 forEach
el.addEventListener('click', handleClick)
```

要点：

- **事件冒泡**：事件从目标往上冒到 `document`。所以可以在父元素上监听、统一处理子元素的事件——即**事件委托**（列表用它能省掉给每个 li 绑定监听）。
- `event.target`（实际触发的元素）与 `event.currentTarget`（绑定监听的那个元素）易混。
- `e.preventDefault()` 阻止默认行为（如链接跳转），`e.stopPropagation()` 阻止冒泡。**两者语义不同**，别混用。
- **批量改 DOM 前先 `display:none`**，或用 `DocumentFragment` 拼好一次插入——否则每个改动都触发一次布局，性能急剧下降。
- 表单输入实时响应用 `input` 事件，而不是 `change`（后者在失焦才触发）。

**存储**：

| 方式 | 容量 | 生命周期 | 用途 |
|---|---|---|---|
| `localStorage` | ~5MB | 永久，除非手动删 | 用户偏好、无敏感性的草稿 |
| `sessionStorage` | ~5MB | 关标签页即清 | 单次会话状态 |
| Cookie | ~4KB | 可设过期 | 需随每个请求发给服务器的（如登录态） |

**凭证不要放 localStorage**（XSS 能读走），登录态优先用 `HttpOnly` Cookie。

## 7. 模块化

```js
// utils.js
export const add = (a, b) => a + b
export default function fmt() {}

// main.js
import fmt, { add } from './utils.js'   // 浏览器里必须写扩展名
```

- 文件里的顶层变量**不再污染全局**，这是 ESM 最大的价值。
- `<script type="module">` 自动 `defer`（等 DOM 解析完再执行）。
- `import` 是静态的、会被提升，所以不能写在 `if` 里（动态导入用 `await import()`）。

## 8. 练习（自己写，别抄上面的示例）

**练习 1 · 待办清单（原生 JS，约 1 天）**
输入框 + 添加按钮 + 列表，支持标记完成、删除、按状态筛选、把数据存进 `localStorage` 刷新后仍在。
硬性要求：列表的点击事件**只能用一处事件委托**实现；渲染函数每次按数据全量重画，不手动去改单个 DOM 节点。
验收：代码里 `document.querySelector` 出现次数不超过 3 次。

**练习 2 · 手写异步控制（约 3 小时）**
不用 `async/await`，只用 `Promise` 实现：给定一个任务数组，**最多同时跑 2 个**，全部完成后按原顺序返回结果。
验收：自己写测试用例验证「任意时刻并发数 ≤ 2」。

**练习 3 · 输出顺序预测 + 验证（约 1 小时）**
先**在纸上写出**下面代码的输出顺序，再实际运行核对，把错的记在笔记里：

```js
async function a() { console.log(1); await null; console.log(2) }
a()
console.log(3)
setTimeout(() => console.log(4))
Promise.resolve().then(() => console.log(5))
```

**练习 4 · 调一个 API 渲染列表（约半天）**
用 `fetch` 拉一个公开 JSON API，渲染成卡片列表；要有加载中状态、失败提示、重试按钮。
验收：断网时页面给出可读提示而不是白屏，控制台无未捕获的报错。

## 9. 自我检查清单

- [ ] 能说出闭包的定义和两个真实用途
- [ ] 看到 `obj.fn()` 与箭头函数能立刻判断 `this`
- [ ] 能解释微任务与宏任务的执行顺序，并手工推导输出
- [ ] 知道 `fetch` 对 404 不会 reject，要自己判 `res.ok`
- [ ] 知道什么时候该上 `Promise.all` 而不是连续 `await`
- [ ] 能说清 `map` 与 `sort` 哪一个会改原数组

## 10. 出处

| 内容 | 出处 |
|---|---|
| JS 全部语法与语义 | MDN JavaScript 指南：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide |
| Promise 与并发方法 | MDN：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Promise |
| DOM 是什么、怎么操作 | MDN：https://developer.mozilla.org/zh-CN/docs/Web/API/Document_Object_Model |
| localStorage | MDN：https://developer.mozilla.org/zh-CN/docs/Web/API/Window/localStorage |
| 事件循环、闭包、原型、异步的深入讲解 | 现代 JavaScript 教程：https://zh.javascript.info/ |
| ES6+ 新语法速查（中文） | https://es6.ruanyifeng.com/ |
| JS 教学与动手示例 | web.dev：https://web.dev/learn/javascript |

**依据说明（重要）**：

- 第 7 节模块化、第 6 节存储对比表，均可在 MDN 对应页面找到依据。
- **本笔记无官方直接依据的部分**：第 7 节"凭证不要放 localStorage、优先用 HttpOnly Cookie"是安全实践建议，官方文档只描述机制、不给出该结论；第 8 节练习的验收指标（"`querySelector` 不超过 3 次""并发数 ≤ 2"）是本人为可自测而定的量化标准，不是官方要求；练习难度与时间估计同样是编排判断。
- 各条语法结论均可在上述官方页面查到原文示例，**引用时以官方页面为准，本笔记的表述可能滞后于标准更新**。

---

上一个：[[01-阶段一 地基（上）HTML与CSS]] · 下一个：[[03-阶段二 工程化 工具链与TypeScript]]
