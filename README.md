# MiniGFM  

Minimal JavaScript Markdown renderer with near-GFM compatibility.

## Features  

- **Extremely small** - Only about 3KB (Brotli compress about 1.5KB), zero dependencies  
- **GFM compatible** (GitHub Flavored Markdown)  
- **XSS-safe**  

## Quick Start  

### Installation  

#### CDN  

```html
<script src="https://cdn.jsdelivr.net/npm/@oblivionocean/minigfm@latest/dist/index.min.js"></script>
```

#### NPM  

```bash
npm i @oblivionocean/minigfm
```

### Basic Usage  

ESModule:  

```js
import MiniGFM from '@oblivionocean/minigfm';

const md = new MiniGFM();
console.log(md.parse('# Hello World')); // Outputs: <h1>Hello World</h1>
```

CommonJS:  

```js
const MiniGFM = require('@oblivionocean/minigfm');
const md = new MiniGFM.MiniGFM();
console.log(md.parse('# Hello World')); // Outputs: <h1>Hello World</h1>
```

## Configuration Options  

| Property     | Type    | Description                                         |
|--------------|---------|-----------------------------------------------------|
| unsafe       | boolean | Allow raw HTML tags (escaped by default)          |
| hljs         | object  | Enable code highlighting (requires hljs instance) |

```js
const md = new MiniGFM({
    unsafe: true, // Allow raw HTML rendering
    hljs: hljs,   // Use highlight.js for code blocks
});
console.log(md.parse('# Hello World')); // <h1>Hello World</h1>
```

## Dependencies  

Completely dependency-free implementation.
