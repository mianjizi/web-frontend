---
tags: [前端, 工程化, Vite, TypeScript, 阶段二]
created: 2026-10-01
阶段: 2 工程化
主要参考: Vite 官方文档 · TypeScript 官方手册 · npm docs
---

# 阶段二 工程化 工具链与 TypeScript

> 一句话：工程化要解决的问题只有一个——**你写的代码浏览器不能直接跑**（用了 TS、`.vue` 文件、裸包名导入），所以中间必须有个环节把它翻译、拼装成浏览器认识的三件套（HTML/CSS/JS）。
> 主要参考：Vite 官方文档（`vite.dev/guide`）、TypeScript 官方手册、npm 官方文档。
> 时间预算：2 周。这一阶段的成果不是"会背命令"，而是**能从零起项目、看懂报错、自己修好**。

## 1. 先理解"为什么需要"

你在阶段一写的是这样：

```html
<script src="./main.js" type="module"></script>
```

一旦开始这么写，就会撞到墙：

| 你写的 | 浏览器为什么不接受 |
|---|---|
| `import { x } from 'lodash'` | 裸包名没有路径，浏览器不知道去哪找 |
| `.ts` / `.vue` 文件 | 不是 JS，浏览器不认识 |
| 几百个模块文件 | 每个都单独请求，HTTP 开销爆炸 |
| 用了新语法 | 老浏览器不支持 |

构建工具就是干这四件事：**解析依赖 → 翻译语法 → 打包压缩 → 起开发服务器**。
**Webpack 不必专门学**（最新 5.111.1，仍在维护但新项目不用），理解"打包器在做什么"即可。

## 2. Node.js 与包管理

Node 让 JS 能脱离浏览器运行，npm 随之成为 JS 的包管理器。

### 2.1 package.json

```jsonc
{
  "name": "my-app",
  "private": true,              // 私有项目，防误发布
  "type": "module",             // 本项目 .js 按 ESM 解析（重要）
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": { "vue": "^3.5.43" },        // 运行时要用
  "devDependencies": { "vite": "^8.3.1" }      // 只在开发/构建时用
}
```

**`dependencies` 与 `devDependencies` 的区别**：前者是"应用跑起来需要的"，后者是"构建/测试/格式化需要的"。装错不影响本地开发，但影响生产环境（只装 dependencies 时会缺东西）。

### 2.2 版本号语义（semver）

`^3.5.43`：允许升到 3.x 的最新（不跨大版本）；`~3.5.43`：只允许 3.5.x；`3.5.43`：锁死。

### 2.3 node_modules 与 lockfile

- `node_modules/`：装下来的代码，**体积巨大，绝不提交**（写进 `.gitignore`，见 [[Git 笔记]]）。
- `package-lock.json` / `pnpm-lock.yaml`：**锁定整棵依赖树的精确版本，必须提交**。它保证"你装的和队友装的一模一样"。
- 没有 lockfile 的项目，同一次 `npm install` 在不同机器上可能拿到不同版本 → "在我电脑上是好的"。

### 2.4 常用命令

```bash
npm init -y                 # 生成 package.json
npm install                 # 按 package.json + lockfile 装齐
npm install <包>            # 装运行时依赖
npm install -D <包>         # 装开发依赖
npm run dev                 # 跑 scripts 里的 dev
npx <命令>                  # 临时执行包里的命令，不全局安装
```

pnpm 最新 12.8.1，用硬链接共享依赖，省磁盘、装得快，全局装一次后可平替 npm 命令。**入门阶段先用 npm**，换 pnpm 是纯收益但会多一层心智负担。

## 3. Vite（当前 8.3.1）

Vite 拆成两半，理解这个拆分，命令就不会记错：

- **开发服务器（`vite` / `npm run dev`）**：不做打包！它直接让浏览器按 ESM 按需请求源码，改哪个文件只重新编译那一个 → 所以启动是秒级的，热更新（HMR）也快。
- **生产构建（`vite build`）**：这时才真正打包，输出到 `dist/`。Vite 8 的打包由 **Rolldown** 完成（Vite 官方 README 明确写了这一点）。

```bash
npm create vite@latest 我的项目 -- --template vue-ts   # 脚手架
npm run dev        # 开发：默认 http://localhost:5173
npm run build      # 产出 dist/
npm run preview    # 本地预览 dist/ 的产物（务必跑一次再上线）
```

模板可用：`vanilla` / `vanilla-ts` / `vue` / `vue-ts` / `react` / `react-ts` / `svelte` / `solid` / `qwik` 等（完整清单见 create-vite 的 npm 页面）。

**环境变量**：只有 `VITE_` 前缀的才会被注入客户端；`.env` 文件里的其他变量只对构建脚本可见。`.env` 一律写进 `.gitignore`。

**Node 版本要求**：Vite 8 要求 `^20.19.0 || >=22.12.0`（npm 包 engines 字段原文）。本机 Node v26.7.0 满足。

## 4. TypeScript（当前 7.0.2）

### 4.1 为什么要用

```js
function total(items) {
  return items.reduce((s, i) => s + i.price, 0)   // items 是数组还是对象？i.price 拼错了没人管
}
total(undefined)   // 运行时才炸
```

TS 把这类错误**提前到编辑器和构建时**。类型不是负担，是"能自动检查的注释"。

> **版本口径提醒**：`typescript` 7.0.2 是**原生编译器线**，npm 包按平台分发二进制（依赖列表里是 `@typescript/typescript-win32-x64` 这类），与 5.x 时代纯 JS 实现的版本号不是一条演进线。网上大量教程写的是 5.x，语法主体一致，遇到行为差异以官方手册为准。

### 4.2 必会语法

```ts
// 基础标注
let n: number = 1
const names: string[] = []
const pair: [string, number] = ['a', 1]        // 元组

// interface（描述对象形状）与 type（联合、交叉等更灵活的别名）
interface User { id: number; name: string; email?: string }   // ? 表示可选
type Status = 'todo' | 'doing' | 'done'         // 字面量联合，比 string 安全得多

// 泛型：类型参数化
function first<T>(list: T[]): T | undefined { return list[0] }

// 类型守卫 / 收窄
function fmt(v: string | number) {
  if (typeof v === 'string') return v.trim()    // 这一支里 v 已确定为 string
  return v.toFixed(2)
}

// 断言（慎用，等于关掉检查）
const el = document.querySelector('#app') as HTMLDivElement
```

### 4.3 该背的原则

1. **`any` 是逃逸口，不是解决方案**。需要"任意类型"时用 `unknown`（用前必须收窄）。
2. **类型从数据推，不手写重复结构**：后端返回 JSON 时用 `interface` 描述一次，之后所有地方复用。
3. **函数参数和返回值都标注**，中间变量让 TS 自动推断——到处标注反而难读。
4. `strict: true` 打开。关了它等于白用 TS。

### 4.4 tsconfig 关键项

```jsonc
{
  "compilerOptions": {
    "strict": true,                 // 必须开
    "target": "ES2022",             // 编译产物的语法级别
    "module": "ESNext",
    "moduleResolution": "bundler",  // 配合 Vite 的解析方式
    "noUncheckedIndexedAccess": true, // 数组下标访问返回 T | undefined，抓越界
    "paths": { "@/*": ["./src/*"] }   // 路径别名，需与 vite.config 的 alias 一致
  }
}
```

**Vite 只做转译不做类型检查**（转译为了快，会直接剥掉类型）。所以：

```bash
npx tsc --noEmit      # 单独做一次全量类型检查
```

建议把它加进 `scripts`（如 `"typecheck": "tsc --noEmit"`），并在编辑器里开启 TS 插件实时提示。

## 5. 代码质量工具

| 工具 | 管什么 | 当前版本 |
|---|---|---|
| ESLint | 找**可能出错**的写法（未使用变量、错误的 hook 用法等） | 10.11.0 |
| Prettier | 统一**格式**（缩进、引号、换行），不管对错 | 3.9.9 |
| Biome | 上面两个二合一（Rust 实现，快） | 2.5.15 |

两件事一定做：

1. 编辑器里开 **"保存时自动格式化"**（VS Code 里 `editor.formatOnSave`），否则你会花半辈子手动对齐。
2. 项目里放一份配置提交进仓库，团队/未来的自己保持一致。

分工记住：**ESLint 管"对不对"，Prettier 管"好不好看"**。二者在格式上会打架，正确做法是把 Prettier 的格式规则从 ESLint 里关掉（用 `eslint-config-prettier`），各自只干自己的事。

## 6. 与本机环境的衔接

- 版本控制用 [[Git 笔记]] 里的流程；**`node_modules/` 和 `.env` 必须在 `.gitignore` 里**，而 `package-lock.json` 必须提交。
- Windows 上以 git-bash 为主时，注意路径写法差异（详见 [[Git 笔记]] 第 6 节）。

## 7. 练习（自己写，别抄上面的示例）

**练习 1 · 从零起一个项目（约 1 小时）**
用 Vite 脚手架建一个 `vue-ts` 项目，跑通 `dev`，改一处文字确认 HMR 生效；再跑 `build` + `preview` 确认产物可用。
验收：能说出 `dev` 与 `preview` 分别跑的是什么，以及为什么 `dev` 启动比 `build` 快得多。

**练习 2 · 给项目接上质量工具（约 2 小时）**
装上 ESLint + Prettier（或 Biome），开保存自动格式化；故意写一个未使用的变量和一个缩进混乱的文件，确认能自动报错/修好。
验收：`npm run lint` 在你的项目里能跑通且输出可读。

**练习 3 · TS 类型改造（约半天）**
把阶段一练习 4（调 API 渲染列表）改成 TS 版：为接口返回值写 `interface`，为渲染函数标注参数类型，开 `strict`。
验收：`npx tsc --noEmit` 零错误；并且**故意把某个属性名写错，确认 TS 能在编辑器里立刻报出来**——这一步是验证你装对了。

**练习 4 · 自己写一份最小构建脚本（约 2 小时，纯理解用）**
不用 Vite，直接用一个打包器（如 esbuild，最新 0.28.2）把两个互相 `import` 的模块打成单个 `bundle.js`，用 Node 起个静态服务器打开它。
验收：能对着产物文件说明「打包器替你做了什么」——这是本阶段真正要拿走的东西。

## 8. 自我检查清单

- [ ] 能解释 lockfile 为什么必须提交、`node_modules` 为什么绝不能提交
- [ ] 知道 Vite 开发时不做打包，生产时才打包
- [ ] 知道 Vite 不做类型检查，要单独跑 `tsc --noEmit`
- [ ] 分得清 `dependencies` 与 `devDependencies`
- [ ] 清楚 ESLint（对不对）与 Prettier（好不好看）的分工
- [ ] 遇到红色报错能自己定位，而不是直接搜"怎么解决"

## 9. 出处

| 内容 | 出处 |
|---|---|
| Vite 概念、命令、配置、环境变量 | https://vite.dev/guide/ |
| Vite 8 使用 Rolldown 打包 | Vite 包 README（npm registry `vite` 包） |
| Vite 8 的 Node 版本要求 | `vite` 包 package.json 的 `engines` 字段：`^20.19.0 \|\| >=22.12.0` |
| 脚手架模板清单 | https://www.npmjs.com/package/create-vite |
| TypeScript 手册 | https://www.typescriptlang.org/docs/handbook/intro.html |
| TypeScript 中文手册（社区镜像） | https://ts.nodejs.cn/docs/handbook/intro.html |
| npm 命令 | https://docs.npmjs.com/cli/v11/commands/npm-init |
| ESLint 上手 | https://eslint.org/docs/latest/use/getting-started |
| Prettier 文档 | https://prettier.io/docs/ |
| 版本号 | 2026-10-01 现查 npm registry `latest` 标签（见 [[00-前端索引]] 版本口径表） |

**依据说明（重要）**：

- Vite 的两阶段拆分、TS 语法、npm 的依赖分类，都能在上述官方页面找到直接依据。
- **本笔记无官方直接依据的部分**：
  - "Vite 只转译不做类型检查，所以要单独跑 `tsc --noEmit`"——这是**生态常识与工程后果的推论**，官方文档描述的是工具职责划分，没有这句结论。
  - "Webpack 不必专门学""入门阶段先用 npm 再换 pnpm""`any` 应改用 `unknown`"——都是本人基于当前技术现状给出的**选修/风格建议**，官方没有这种规定。
  - 练习的时间估计与验收标准同样是编排判断。
- TypeScript 7 的**发行方式**（按平台分发二进制的依赖列表）是 2026-10-01 从 npm registry 包元数据读到的；关于"7.x 是原生编译器线"的判断基于该元数据，官方手册对版本线的表述请以 typescriptlang.org 当前页面为准。

---

上一个：[[02-阶段一 地基（下）JavaScript核心]] · 下一个：[[04-阶段三 框架 Vue3 与 React]]
