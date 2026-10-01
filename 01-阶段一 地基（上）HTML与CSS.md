---
tags: [前端, HTML, CSS, 阶段一]
created: 2026-10-01
阶段: 1 地基（上）
主要参考: MDN 学习区 · web.dev Learn HTML/CSS
---

# 阶段一 地基（上）HTML 与 CSS

> 一句话：HTML 是**内容的骨架**，CSS 是**给骨架穿衣服的规则表**。两者都不是编程语言，学它们靠的是「记住有什么可用」+「练布局直觉」，没有逻辑推理的难关。
> 主要参考：MDN 学习 Web 开发（`/zh-CN/docs/Learn_web_development`）、web.dev Learn HTML / Learn CSS。
> 时间预算：3 周。判定标准不是「看完了」，是**能照着设计图手写出静态页**。

## 1. 心智模型

```
HTML           CSS              JS
结构            表现             行为
「这是标题」    「标题大一号」    「点这个按钮收起菜单」
```

三条规矩，违反了后面一定返工：

1. **语义优先**：能用 `<nav>` 就别用 `<div class="nav">`。语义标签让屏幕阅读器、搜索引擎、以后的你自己都读得懂。
2. **结构与表现分离**：HTML 里不要写 `style="color:red"`，不要用 `<br>` 调间距。全交给 CSS。
3. **不要用标签做视觉效果**：`<table>` 不用于布局，`<b>` 不等于加粗的语义。

## 2. HTML：记住结构，不是背标签

### 2.1 最小文档骨架

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>页面标题</title>
  </head>
  <body>
    <!-- 内容 -->
  </body>
</html>
```

两行 meta 各有原因，别漏：

- `charset="utf-8"`：不写中文会乱码。
- `viewport`：不写手机浏览器会按桌面宽度缩放，移动端适配直接废掉。

### 2.2 语义化骨架（背下这套布局）

`header` / `nav` / `main` / `article` / `section` / `aside` / `footer`。
判断标准：**去掉 CSS 后，页面仍然是可读的文档**，就说明语义对了。

### 2.3 常用元素分组记忆

| 场景 | 元素 |
|---|---|
| 标题/段落 | `h1`~`h6`（**一页只一个 h1**）、`p` |
| 列表 | `ul` `ol` `li`、定义列表 `dl` `dt` `dd` |
| 链接/图片 | `a href`、`img src alt`（`alt` 是必填的替代文本，不是可选项） |
| 强调 | `strong`（重要性）/ `em`（语气强调），不是"加粗/斜体" |
| 分组 | `div`（无语义的块）/ `span`（无语义的行内） |
| 表单 | `form` `label` `input` `select` `textarea` `button` |
| 表格数据 | `table` `thead` `tbody` `tr` `th` `td`（**只用于表格数据**） |

表单里 `label` 用 `for` 关联 `input` 的 `id`——点文字能聚焦输入框，无障碍也要求这样。

### 2.4 属性

- 全局属性：`id`（唯一）、`class`（可重复，用于 CSS/JS 选择）、`style`（避免）、`data-*`（自定义数据，JS 读取用）、`hidden`、`title`。
- `id` 与 `class` 的分工：`id` 给 JS 精确拿一个元素，`class` 给 CSS 批量描述样式。**CSS 尽量不用 id 选择器**（优先级太高，后期难以覆盖）。

## 3. CSS：三条主线

### 3.1 选择器与优先级

| 选择器 | 写法 | 优先级贡献 |
|---|---|---|
| 元素 | `p` | 1 |
| 类 | `.card` | 10 |
| id | `#main` | 100 |
| 行内 | `style="..."` | 1000 |
| `!important` | `color:red !important` | 最高（**禁止滥用**） |

**优先级相同时，后写的赢**——这就是「样式改了没生效」90% 的原因。调试口诀：打开开发者工具看样式上有没有删除线，被谁划掉了。

新工具：`@layer` 级联层可以把优先级按层管理，是现代 CSS 的走向（MDN 检索 "CSS 层叠层 / Cascade Layers"）。

### 3.2 盒模型

```
┌───────── margin（外边距，透明的推挤距离）─────────┐
│ ┌─────── border ────────┐                        │
│ │ ┌──── padding ────┐   │                        │
│ │ │     content     │   │                        │
│ │ └─────────────────┘   │                        │
│ └───────────────────────┘                        │
└──────────────────────────────────────────────────┘
```

**必做的一步**：全局设 `box-sizing: border-box`——让 `width` 包含 padding 和 border，否则「设了 200px 实际占 240px」，布局会一直对不上。

```css
*, *::before, *::after { box-sizing: border-box; }
```

**外边距塌陷**：相邻块级元素的垂直 margin 会合并（取较大值），父元素与第一个子元素的 margin 也会塌陷。这是布局"莫名多出/少了间距"的常见来源。

### 3.3 布局：Flex 与 Grid

| | Flexbox | Grid |
|---|---|---|
| 维度 | 一维（一行**或**一列） | 二维（行**和**列同时） |
| 场景 | 导航栏、按钮组、垂直居中、等分排列 | 整页布局、卡片网格、dashboard |
| 记忆锚点 | 管"排成一排的东西怎么分" | 管"画格子，东西放哪格" |

**Flex 最小可用集**：容器上 `display:flex`、`justify-content`（主轴对齐）、`align-items`（交叉轴对齐）、`gap`（间距，**不要再用 margin 挤**）；子项上 `flex: 1`（等分/占满剩余）。

**Grid 最小可用集**：`display:grid`、`grid-template-columns`、`gap`。最常用的一行：

```css
/* repeat + minmax + auto-fit = 卡片自动换行、宽度自适应，不需要媒体查询 */
grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
```

**定位**：`static`（默认）/ `relative`（相对自身原位置偏移，常作定位参照）/ `absolute`（相对最近的已定位祖先）/ `fixed`（相对视口，滚动不动）/ `sticky`（滚到阈值后粘住）。

### 3.4 单位

- 绝对：`px`。
- 相对：`rem`（相对根字号，**做排版尺寸首选**）、`em`（相对自身/父字号，容易算错）、`%`、`vw/vh`（视口百分比）、`ch`。
- 现代：容器查询单位 `cqw` 等（组件级响应式的方向）。

### 3.5 响应式

从**移动优先**写起：默认样式是手机版，再用 `min-width` 媒体查询往上加。

```css
.card { padding: 1rem; }
@media (min-width: 768px) { .card { padding: 2rem; } }
```

`<meta viewport>`（见 2.1）+ 相对单位 + Flex/Grid，三者到位，大部分适配就完成了。

### 3.6 现代 CSS 特性（2026 年该用的）

- **自定义属性（变量）**：`--brand: #2563eb;` → `color: var(--brand);`。换肤、主题全靠它。
- **原生嵌套**：支持在选择器里直接写子规则，不再依赖 Sass（只是可读性便利，不是必需）。
- **`:is()` / `:where()` / `:has()`**：`:has()` 能"根据子元素状态选中父元素"，以前必须用 JS 做的事现在纯 CSS 能做。
- **`aspect-ratio`**：固定宽高比，替代 padding-top 百分比黑魔法。
- **`@layer`**：管理优先级层次。

### 3.7 与预处理器/原子化框架的关系

- Sass/Less 的必要性已明显下降（原生变量 + 嵌套 + 级联层补上了大部分场景）。**先不用学**。
- Tailwind（v4.3.3）是"原子类"方案：把样式写在 class 名里。**建议阶段 3 再做第一个真实项目时引入**，现在学它会让你绕过 CSS 本身的练习。

## 4. 浏览器怎么把这两样变成画面

一次渲染的主干路径（理解它，才能解释"白屏一下"和"改样式很卡"）：

```
HTML → DOM 树
CSS  → CSSOM 树
        ↓ 合并
      渲染树 → 布局(Layout/Reflow，算位置尺寸) → 绘制(Paint) → 合成(Composite)
```

关键推论：

- **改几何属性（宽高、位置）会触发 Layout，代价最大**；改颜色只触发 Paint；只动 `transform` / `opacity` 可以只走合成，所以动画优先用这两个。
- JS 执行会阻塞渲染。把 `<script>` 放 `</body>` 前，或用 `defer`。
- CSS 放 `<head>`：样式是阻塞渲染的，放最后会闪一下无样式内容（FOUC）。

## 5. 练习（自己写，别抄上面的示例）

**练习 1 · 静态个人页（约 4~6 小时）**
用语义标签搭一页：头部 + 导航 + 一块主内容（含 3 张卡片）+ 页脚，内容用你自己的真实信息。
另外加一个表单区块，字段包含姓名（文本）、邮箱（email 类型）、年级（下拉）、备注（多行），每个字段都有 `<label>` 关联。
验收：不写任何 `style` 属性、不用 `<table>` 布局、不用 `<br>` 调间距；关掉 CSS 后页面仍读得通。

**练习 2 · 用 Grid 复刻一张卡片网格（约 2 小时）**
把练习 1 的 3 张卡片改成：窗口变宽时自动从 1 列变 2 列、3 列，且卡片间距一致。
验收：只能改 CSS，一行媒体查询也不用写。

**练习 3 · 深色模式（约 2 小时）**
用 CSS 变量 + `prefers-color-scheme` 媒体查询，让页面跟随系统深浅色切换。
验收：全部颜色都走 `var(--…)`，切换时全站一致，不出现某个元素漏色的情况。

**练习 4 · 找茬（约 1 小时）**
随便打开一个网站的开发者工具，找出一个用 `<div>` 堆出来的区域，写出「如果用语义标签应该改成什么、为什么」。
这一步练的是**读别人代码时的判断力**，比写更重要。

## 6. 自我检查清单

- [ ] 能解释为什么 `box-sizing: border-box` 是全局必设
- [ ] 不看资料说出 Flex 与 Grid 各自适用的三个场景
- [ ] 知道样式不生效时，第一个动作是打开开发者工具看优先级被谁覆盖
- [ ] 能从零手写一份语义化 + 响应式的静态页结构
- [ ] 知道移动端适配三件套是什么

## 7. 出处

| 内容 | 出处 |
|---|---|
| HTML 元素全表、语义化、表单、无障碍 | MDN HTML 参考：https://developer.mozilla.org/zh-CN/docs/Web/HTML/Reference/Elements |
| 学习路径与练习 | MDN 学习区：https://developer.mozilla.org/zh-CN/docs/Learn_web_development |
| 可选性（Accessibility）基础 | MDN：https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Accessibility |
| Flexbox 基础概念 | MDN：https://developer.mozilla.org/zh-CN/docs/Web/CSS/Guides/Flexible_box_layout/Basic_concepts |
| Grid 基础概念 | MDN：https://developer.mozilla.org/zh-CN/docs/Web/CSS/Guides/Grid_layout/Basic_concepts |
| 渲染路径（Critical rendering path） | MDN：https://developer.mozilla.org/zh-CN/docs/Web/Performance/Guides/Critical_rendering_path |
| HTML/CSS 教程与动手示例 | web.dev：https://web.dev/learn/html · https://web.dev/learn/css |
| Tailwind v4 安装（阶段 3 再看） | https://tailwindcss.com/docs/installation/using-vite |

**依据说明（重要）**：

- 上表列出的内容，均可直接在上述官方页面找到对应章节。
- **本笔记无官方直接依据的部分**：第 4 节末尾三条推论（用 `transform`/`opacity` 做动画、"改几何属性代价最大"、CSS 放 head 的 FOUC 提示）是把官方渲染路径描述**用于工程判断**后的经验总结；第 5 节练习的难度分级与时间估计、第 3.7 节"先不用学 Sass、阶段 3 再上 Tailwind"的顺序建议，都是本笔记的编排判断，官方材料里没有这种先后规定。
- 官方对这一阶段的界定是「从萌新到舒适，而非到专家」（MDN 学习区原话），练习量按此设定。

---

上一个：[[00-前端索引]] · 下一个：[[02-阶段一 地基（下）JavaScript核心]]
