# MiniGFM

极小的JavaScript Markdown渲染器，具有接近GFM的兼容性。| Minimal JavaScript Markdown renderer with near-GFM compatibility.

## 特性

- 极小的，仅 3KB 左右（Brotli 压缩大约1.5KB），0 依赖
- 兼容 GFM （GitHub Flavored Markdown）
- XSS 安全

## 快速开始

### 引入

#### CDN

```html
<script src="https://cdn.jsdelivr.net/npm/@oblivionocean/minigfm@latest/dist/index.min.js"></script>
```

#### NPM

```bash
npm i @oblivionocean/minigfm
```

### 使用

ESModule:

```js
import MiniGFM from '@oblivionocean/minigfm';

const md = new MiniGFM();
console.log(md.parse('# Hello World')); // <h1>Hello World</h1>
```

CommonJS:

```js
const MiniGFM = require('@oblivionocean/minigfm');
const md = new MiniGFM.MiniGFM();
console.log(md.parse('# Hello World')); // <h1>Hello World</h1>
```

## 配置

| 属性 | 类型 | 描述 |
| --- | --- | --- |
| options.unsafe | boolean | 不转移HTML标签 |
| options.hljs | object | 高亮代码块, 传入hljs对象 |

```js
const md = new MiniGFM({
    unsafe: true, // 允许html标签
    hljs: hljs, // highlight.js
})
console.log(md.parse('# Hello World')); // <h1>Hello World</h1>
```

## 依赖

无需依赖。
