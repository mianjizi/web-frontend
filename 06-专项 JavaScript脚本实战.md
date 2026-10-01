---
tags: [前端, JavaScript, 脚本, 专项, Node]
created: 2026-10-01
阶段: 专项（接在阶段一 下 之后）
主要参考: Node.js 官方文档 · MDN · Tampermonkey 官方文档
---

# 专项 JavaScript 脚本实战

> 一句话：JS 自己不会跑，跑它的是**宿主**——浏览器、Node、用户脚本管理器。所谓"写脚本"，就是交给宿主一个文件；差别只在宿主**多给你什么全局对象**、打算让你用它干什么。
> 主要参考：Node.js 官方文档（`nodejs.org/api`）、MDN、Tampermonkey 官方文档。
> 前置：[[02-阶段一 地基（下）JavaScript核心]]（语言本身）。那篇讲"JS 是什么"，本篇只讲"怎么让它真的跑起来"。
> 时间预算：2 周。判定标准不是"看懂了"，是**能写出一个带参数、可重跑、失败会报错的脚本**。

## 1. 心智模型：同一门语言，三种宿主

| 宿主 | 谁在执行 | 多拿到什么 | 少掉了什么 | 典型脚本 |
|---|---|---|---|---|
| 浏览器页面 | 浏览器（JS 引擎 + 渲染引擎） | `window`、`document`、`localStorage`、`fetch`（受同源策略约束） | 没有 `fs`，不能读写本机磁盘 | 表单校验、页面交互、动态渲染 |
| Node 进程 | 独立的操作系统进程 | `process`、`fs`、`path`、`os` | 没有 `document`、没有 `window` | 批处理文件、抓数据、本地小工具 |
| 用户脚本 | 脚本管理器注入到**别人的页面**里 | 页面的 `document`，**外加**管理器给的 `GM_*` API | 没有 `fs`（除非管理器额外放开） | 给已有的网站加功能（本课配套的用户脚本就属这类） |

两条能立刻用的判断：

- 报 `document is not defined` → 在 Node 里跑了浏览器代码，宿主搞错了。
- 报 `require is not defined`、`Cannot use import statement outside a module` → 模块系统没对上（见 2.2）。

同一门语言、同一套语法，换个宿主就得换一套"和世界打交道"的 API。**先问"这段脚本归谁跑"，再动手写。**

## 2. Node：从「一条命令」开始

### 2.1 怎么让一个文件跑起来（本机 v26.7.0 实测）

| 写法 | 作用 |
|---|---|
| `node a.js` | 按最近的 `package.json` 里 `"type"` 决定按 CJS 还是 ESM 解析 |
| `node a.mjs` | 强制按 ESM 解析（后缀优先于配置） |
| `node a.ts` | **本机实测直接跑通，不需要任何 flag、无警告**：Node 剥掉类型标注后就执行 |
| `node --run <名字>` | 执行 `package.json` 里 `scripts` 的那条命令（省掉 `npm run`） |
| `echo '…' \| node --input-type=module -` | 从标准输入喂一段代码，试语法用，不落文件 |

`node a.ts` 这条是**本机实测结论**，不是普遍规律（老版本要靠 `--experimental-strip-types` 之类的开关）。而且注意：**"能跑"不等于"会检查类型"**——它只是把类型标注删掉，类型错误照样留到运行时才炸。真要类型检查仍然得上 `tsc`（本机实测：全局 `tsc` 命令不存在，阶段二装完工具链再补）。

### 2.2 模块系统：老 CJS 与新 ESM

| | CJS（CommonJS） | ESM（ECMAScript Modules） |
|---|---|---|
| 写法 | `const x = require('x')` / `module.exports = …` | `import x from 'x'` / `export const …` |
| 求值时机 | **运行时**求值，可以写在 `if` 里 | **静态**，`import` 会被提升，不能写进 `if` |
| 顶层 `await` | 不行 | 可以 |
| 相对导入扩展名 | 可省略 | **必须写全**（`./util.js`；漏了报 `ERR_MODULE_NOT_FOUND`） |
| 目录常量 | `__dirname` / `__filename` | 都没有，用 `import.meta.dirname`（本机实测可用） |

怎么选：**新脚本一律 ESM**。让 `.js` 按 ESM 解析只要一句——在 `package.json` 里写 `"type": "module"`；懒得建 `package.json` 就直接用 `.mjs` 后缀。

混用要点：Node 里 ESM 可以 `import` 一个 CJS 包（拿到的是它的 `module.exports`），反过来在 CJS 里 `require` 一个 ESM 包会失败。所以**一个项目里别两套混着写**。

### 2.3 起步三件套：process / fs / path

**process** —— 脚本与外界的接口。

```js
process.argv        // 实测（node argv.mjs 甲 乙 "带 空格"）
                    //   [0] = 解释器全路径  [1] = 脚本文件全路径  [2..] = 真实参数
process.env         // 环境变量
process.exitCode    // 用它设置退出码（优先于 process.exit）
process.cwd()       // 当前工作目录 —— 注意：不是脚本所在目录
```

`argv` 的坑：**参数从索引 2 开始**，取真正传进来的参数一律 `process.argv.slice(2)`。

退出码：优先 `process.exitCode = 1` 再让脚本自然结束，不要随手 `process.exit(1)` —— 官方文档明确说它会**不管尚未完成的异步操作（含写 stdout / stderr）就把进程强行结束**，所以日志、产物有被截断的风险。但要如实说明：这是「可能」而非「必然」，本机实测用 300 KB 直写 stdout 后立刻 `exit()`，**没有复现出截断**（直写文件通常来得及 flush），风险主要在输出到慢管道时。无论如何，能让进程自己走完就别硬杀；而脚本能被定时任务或别的脚本调用的前提，正是它能用退出码表达成败。

解析命令行参数用**内置**的 `node:util`（本机实测有）：

```js
import { parseArgs } from 'node:util'   // 不必一上来就装 commander / yargs
const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: { dir: { type: 'string' }, loud: { type: 'boolean' } },
})
```

**fs** —— 读写磁盘，常用就四个：`readFile` / `writeFile` / `readdir` / `mkdir`。

- 用 `node:fs/promises`（`await` 版），别用回调版。
- **不传 `encoding` 拿到的是 `Buffer` 而不是字符串**；读写文本一律显式 `'utf8'`，否则中文乱码。
- `writeFile` 是**整篇覆盖**：改已有文件的内容要"读进来 → 改 → 写回去"；只想追加用 `appendFile`。
- 覆盖一个正在被别的程序读的文件有"读到半截"的风险：稳妥做法是先写临时文件、再 `rename` 覆盖（改名是原子操作）。

**path** —— 拼路径。

```js
import path from 'node:path'
path.join(import.meta.dirname, 'data', 'a.json')   // 按平台给分隔符（Windows 上是 \）
path.resolve('a.json')                             // 转绝对路径，基准是 cwd
```

**路径是新手脚本第一大坑**：脚本里的相对路径是相对**当前工作目录**（`process.cwd()`），不是相对脚本文件所在目录——换个地方 `cd` 再跑就找不到文件。要固定基准就用 `import.meta.dirname` 拼绝对路径。

### 2.4 让脚本「能被重跑」

脚本从"能跑一次"变成"能当工具用"，靠三件事：

1. **幂等**：重跑结果一致、不破坏已有数据（本课示例里的批处理脚本都按这个口径写）；
2. **参数化**：目录、关键词从命令行来，不写死在代码里；
3. **有退出码 + 有可读错误**：失败时说清"哪一步、哪个文件、什么错"，而不是抛一整屏堆栈。

## 3. 浏览器一侧：三种注入方式

| 方式 | 怎么写 | 用于 |
|---|---|---|
| 页面脚本 | `<script src="a.js" defer></script>` | 自己写的页面 |
| 模块脚本 | `<script type="module" src="a.js"></script>` | 要用 `import` 时；模块脚本**天然 defer** |
| 控制台临时跑 | 开发者工具 Console 里直接敲 | 调试、临时试验，刷新即消失 |

调试第一入口是 Console 与 Sources：`console.log` 看变量，Sources 里打断点看调用栈。Console 里的报错**是可点开的**，点进去直接落到出错那一行——比翻代码找快得多。

**用户脚本**（本机实际在用的一类）：把一段 JS 装进浏览器，在**指定网站的页面**上自动执行。

```js
// ==UserScript==
// @name         示例
// @match        https://example.com/*
// @grant        GM_setValue
// @updateURL    https://…/x.user.js
// ==/UserScript==
```

- `@match` 决定注入范围。**不要写 `*://*/*`**：注入所有页面的脚本出错面最大，也最容易被当成恶意脚本。
- `@grant` 决定能不能用 `GM_*` 存储/网络 API（不声明就是纯页面环境）。
- `@updateURL` 让管理器能检查更新（本课的示例用户脚本就是这样分发的）。

DOM 操作的具体规则见 [[02-阶段一 地基（下）JavaScript核心]] 第 6 节（事件委托、`DocumentFragment`），本篇不重复。

## 4. 抓数据：先把「别把人当傻子」写进代码

Node 内置 `fetch`（本机实测：真请求 `https://example.com` 返回 200，`AbortController`、`AbortSignal.timeout` 都在）。四条自己定的纪律，理由都写在括号里：

1. **带真实浏览器 UA**（实测对照：Node 的 fetch **默认 UA 就是字符串 `node`** —— 不带 UA 等于主动报身份，对方服务器一眼看出来）；
2. **带完整头**（`Accept`、`Accept-Language` 等），不要只丢一个 UA 上去；
3. **随机间隔**：请求之间 `await sleep(1000 + Math.random() * 2000)`，不要在循环里连发；
4. **不逆向私有接口**：能走公开接口 / RSS 就走公开的。

```js
const res = await fetch(url, {
  headers: {
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.8037.59 Safari/537.36',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language': 'zh-CN,zh;q=0.9',
  },
  signal: AbortSignal.timeout(20_000),   // 别让脚本永远挂着
})
if (!res.ok) throw new Error(`HTTP ${res.status}`)   // fetch 对 404/500 不 reject
```

（本机实测：这样发出的请求，服务端看到的 UA 就是上面那一串——**能改，也真的改了**。）

**边界**（长期口径）：脚本只做**只读采集与本地整理**；登录、提交、发帖这类"代表我在平台上做事"的动作不写进脚本。

## 5. 排错：脚本不听话时按这个顺序查

| 现象 | 多半是什么 | 怎么改 |
|---|---|---|
| 输出顺序不对、程序「还没干完就说完成了」 | `forEach(async …)` 这类写法**不会等待**：函数立刻返回，错误也被吞掉（本机实测：先打印「全部完成」，再陆续打印各项） | 改 `for…of` + `await`；主逻辑包进 `async function main()` 并接 `main().catch(…)` |
| 逻辑都跑完了，最后却以非零码崩掉、堆栈指向调用处 | 有 Promise 没被接住，未处理的 rejection 在 Node 里算致命错误 | 每处异步要么 `await`，要么 `.catch()`；顶层兜一个 `main().catch(e => { console.error(e); process.exitCode = 1 })` |
| `document is not defined` | 在 Node 里跑了浏览器代码 | 换宿主，或改用 Node 的文件/网络 API |
| `require is not defined` | 在 ESM 里用了 CJS 写法 | 改 `import`；或给 `package.json` 加 `"type": "commonjs"` |
| 警告 `MODULE_TYPELESS_PACKAGE_JSON`、说「已按 ES module 重新解析」 | `.js` 里有 import 语法但没声明模块类型。**本机 v26.7.0 实测：只警告，并自动重解析成功，不再报错**（老版本 Node 在这里会硬报 `Cannot use import statement outside a module`） | 给 `package.json` 加 `"type": "module"` 消除警告；不想动它就改后缀 `.mjs` |
| `ERR_MODULE_NOT_FOUND` | ESM 相对导入漏了扩展名 | 写 `./util.js` 而不是 `./util` |
| 中文变乱码 | 读写没给 `utf8` | `readFile(p, 'utf8')` |
| 每行结尾多一个 `\r` | 文件是 CRLF（Windows 上 Git 检出常见） | 读进来 `.replace(/\r\n/g, '\n')`；别拿多行字符串做精确匹配 |
| `ENOENT` 找不到文件 | 相对路径相对的是 **cwd**，不是脚本目录 | 用 `import.meta.dirname` 拼绝对路径 |
| 脚本卡住不退出 | 有没关的句柄（服务器、定时器、没 abort 的请求） | `AbortSignal.timeout`、`clearInterval`、`server.close()` |
| 退出码 0 但结果明显不对 | 没检查返回值、没判 `res.ok` | 显式校验，失败就设非零退出码 |
| 日志少一截、产物不完整 | 用了 `process.exit()` 硬杀进程，异步 I/O 没走完 | 改 `process.exitCode`，让脚本自然结束（本机 300 KB 直写未复现截断，风险主要在慢管道） |

## 6. 练习（自己写，别抄上面的片段）

**练习 1 · 文件批处理小工具（约 2 小时）**
写一个脚本：给它一个目录，统计其中所有 `.md` 的行数与字符数，按字符数从多到少打印一张表。
要求：目录从 `--dir` 参数来；不传参数时**打印用法并以非零码退出**（不能用抛异常代替）。
验收：路径含空格、含中文都能跑通；同一目录跑两次结果完全一致；脚本里不出现写死的绝对路径。

**练习 2 · 抓一个公开 JSON API 落盘（约 2 小时）**
抓一个公开 API，把结果写到 `./out/<日期>.json`。
要求：带真实 UA 与完整头；请求间隔随机 1–3 秒，连抓 3 次；单次失败重试 2 次；用 `AbortSignal.timeout` 限时。
验收：把网络断开再跑，给出的错误是**一句能读懂的话**且退出码非 0；三次请求的间隔在日志时间戳里看得出来。

**练习 3 · 写一个自己的用户脚本（约 3 小时）**
挑一个你天天看的网页，用用户脚本给它加一个小功能（批量复制某个列表、自动折叠某块、调标题字号都行）。
验收：`@match` 精确到域名而不是 `*://*/*`；刷新页面即生效；Console 无报错；关掉脚本后页面恢复原状。

**练习 4 · 读一个真实脚本（约 1 小时）**
读一个**你自己写过的脚本**（或你在用的用户脚本），用三句话写清：它怎么拿到数据 / 它怎么防止重复执行 / 失败时它怎么表现。
验收：能指出至少一处「我会这么改」的地方。这一步练读代码，比写更值钱。

## 7. 自我检查清单

- [ ] 能说出同一段 JS 在浏览器和 Node 里各多拿到什么、少了什么
- [ ] 知道 `.mjs` 与 `"type": "module"` 分别在解决什么问题
- [ ] 能解释漏写 `await` 为什么会让脚本"静默什么都不做"
- [ ] 知道脚本里的相对路径相对的是当前工作目录，不是脚本目录
- [ ] 知道 `writeFile` 是整篇覆盖，追加要用 `appendFile`
- [ ] 写网络脚本时默认带上真实 UA 与随机间隔
- [ ] 脚本能用退出码表达成败（0 成功、非 0 失败）

## 8. 出处

| 内容 | 出处 |
|---|---|
| Node API 总入口（实测可达，页面自标 v26.10.0 文档） | https://nodejs.org/docs/latest/api/ |
| 命令行选项（`--run` / `--watch` / `--test`、类型剥离） | https://nodejs.org/api/cli.html |
| 模块系统 CJS/ESM、`import.meta` | https://nodejs.org/api/module.html |
| `"type"` 字段与包解析规则 | https://nodejs.org/api/packages.html |
| 文件系统 API | https://nodejs.org/api/fs.html |
| `process`（argv / exitCode / env / cwd） | https://nodejs.org/api/process.html |
| 内置测试运行器 | https://nodejs.org/api/test.html |
| 官方入门教程（英文） | https://nodejs.org/en/learn/getting-started/introduction-to-nodejs |
| Node 文档中文（官方站点中文页 / 社区镜像，均实测可达） | https://nodejs.org/zh-cn/docs/ · https://nodejs.cn/api/ |
| JS 模块指南（浏览器侧） | https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Modules |
| `import` 语句 | https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/import |
| DOM | https://developer.mozilla.org/zh-CN/docs/Web/API/Document_Object_Model |
| `fetch` / `AbortController` | https://developer.mozilla.org/zh-CN/docs/Web/API/Window/fetch · https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController |
| `console` | https://developer.mozilla.org/zh-CN/docs/Web/API/console |
| 开发者工具 Console 怎么用 | https://developer.chrome.com/docs/devtools/console |
| 用户脚本管理器与元数据块（`@match`/`@grant`/`@updateURL`） | https://www.tampermonkey.net/ · https://www.tampermonkey.net/documentation.php?locale=zh-CN |
| 用户脚本仓库（找现成的来读） | https://greasyfork.org/zh-CN |
| 浏览器侧 JS 动手示例 | https://web.dev/learn/javascript |

**本机实测（2026-10-01；探针脚本 `code/probe/node_probe.mjs` 可重跑）**：

| 项目 | 实测结果 |
|---|---|
| Node / npm | v26.7.0 / 11.19.0 |
| 内置 `fetch` | 有；真请求 `https://example.com` 返回 200 |
| Node fetch 的**默认** UA | 服务端收到字符串 `node`（`Request` 对象上读不到，UA 在发送时才由运行时加上；不带 UA 等于主动报身份） |
| Node fetch 改 UA | **有效**（httpbin 回显即所设的 Chrome UA） |
| `node a.ts` | 直接跑通，无 flag、无警告（只剥类型，不做类型检查） |
| 全局 `tsc` / `deno` / `bun` | 均**不存在** |
| `node --run <名字>` | 可用（本机实测直接跑通 `package.json` 里的 scripts，不必经 npm） |
| `forEach(async …)` 的等待行为 | **不等待**：实测先打印「全部完成」，再陆续打印各项；异常不外抛 |
| `.js` 里有 import、但没声明模块类型 | 实测**只警告并自动按 ESM 重解析**（`MODULE_TYPELESS_PACKAGE_JSON`），不是报错 |
| `process.exit()` 截断 stdout | 官方说「可能」；本机 300 KB 直写**未复现**（直写文件来得及 flush，风险主要在慢管道） |
| `import.meta.dirname`、`parseArgs`、`Object.groupBy`、`Promise.withResolvers`、`AbortController`/`AbortSignal.timeout` | 均可用 |
| 本机 Chrome（构造 UA 用） | 154.0.8037.59 |

链接可达性：上表链接逐条实测（真实浏览器 UA + 随机间隔）。`web.dev/learn/javascript` 首次请求未连通、重试即 200，属网络抖动，非永久失效。

**依据说明（重要）**：

- 有官方直接依据：第 2.2 节 CJS/ESM 差异表、2.3 节 `process.argv` 结构、`node:util` 的 `parseArgs`、`import.meta.dirname`、`fs/promises` 与 `writeFile` 的覆盖语义、`rename` 的原子性，均可在 Node 官方文档对应页面找到原文。
- **本笔记无官方直接依据的部分**：
  - 第 1 节「三种宿主」的划法与表格归属，是本人为便于记忆做的编排，官方没有这种分类；
  - 第 4 节四条抓取纪律（真实 UA、完整头、随机间隔、不逆向私有接口）是**本人自定规矩**，官方文档只描述 API 能力，不规定该怎么抓；
  - 第 2.4 节「能被重跑」的三条口径（幂等 / 参数化 / 退出码）是工程判断；
  - 第 5 节排错表的**排序**，以及第 6 节练习的时长估计与验收指标（如"间隔在日志里看得出来""`@match` 精确到域名"），均为本人编排判断。表中「`forEach(async …)` 不等待」「模块类型只警告并自动重解析」两行是**本机实测结论**，其余行是常见成因归纳（成因判定属经验判断，非官方声明）。
- 第 2.1 节「`node a.ts` 可直接跑」是**本机 v26.7.0 的实测结论**，不构成对其它版本的断言；版本数字一律以本机实测为准，不采信网络文章的"截至某年"。第三方链接的内容会变动，**引用以官方页面为准**。

---

上一个：[[05-阶段四 进阶 上线与质量]] · 回目录：[[00-前端索引]]
