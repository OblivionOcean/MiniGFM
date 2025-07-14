/**
 * MiniGFM - 一个简单的Markdown解析器，基本支持GFM语法。
 * @author OblivionOcean
 * @version 1.0.4
 * @class
 */
export class MiniGFM {
    /**
     * @property {Map} escapeMap
     * @description html 转义字符
     * @private
     * @static
     */
    escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    };

    constructor(options) {
        this.options = options || {};
    }

    /**
    * 解析Markdown文本并返回HTML字符串
    * @param {string} markdown - Markdown文本
    * @returns {string} HTML字符串
    */
    parse(markdown) {
        if (typeof markdown != "string") return '';
        const codeBlocks = [], codeInline = [];
        markdown = markdown
            // 转义特殊字符
            .replace(/\\([\\*_{}[\]()#+\-.!])/g, '$1')
            // 保存原始代码块
            .replace(/(?:^|\n)(`{3,4})[ ]*(\w*?)\n([\s\S]*?)\n\1/g, (_, __, lang, code) => {
                codeBlocks.push({ lang: lang.trim(), code: code.trim() });
                return `<!----CODEBLOCK${codeBlocks.length - 1}---->`;
            })
            // 保持内联代码 
            .replace(/`([^`]+)`/g, (_, code) => {
                codeInline.push(this.escapeHTML(code));
                return `<!----CODEINLINE${codeInline.length - 1}---->`;
            })
            // 删除注释
            .replace(/%%[\n ][^%]+[\n ]%%/g, '');

        if (!this.options.unsafe) markdown = this.safeHTML(markdown);

        return this.parseInlines(this.parseBlocks(markdown))// 解析块和内联元素
            // 恢复内联代码
            .replace(/<!----CODEINLINE(\d+)---->/g, (_, id) =>
                codeInline[id] ? `<code>${codeInline[id]}</code>` : ''
            )
            // 恢复代码块
            .replace(/<!----CODEBLOCK(\d+)---->/g, (_, id) => {
                if (!codeBlocks[id]) return '';
                const { lang, code } = codeBlocks[id];
                let highlighted = code;

                if (this.options.hljs) try {
                    highlighted = (lang
                        ? this.options.hljs.highlight(code, { language: lang })
                        : this.options.hljs.highlightAuto(code)).value;
                } catch { }

                return lang
                    ? `<pre lang="${lang}"><code class="hljs ${lang} lang-${lang}">${highlighted}</code></pre>`
                    : `<pre><code>${highlighted}</code></pre>`;
            });
    }

    /**
     * 解析跨行元素和行级块
     * @param {string} text - 待处理的文本
     * @returns {string} 处理后的文本
     * @private
     * @static
     */
    parseBlocks(text) {
        console.log(text)
        return text
            // 标题
            .replace(/^[^\\]?\s*(#{1,6}) ([^\n]+)$/gm, (match, level, content) => {
                return `<h${level.length}>${content}</h${level.length}>`;
            })

            // 任务列表
            .replace(/^[ \t]*[-\*\+][ \t]+\[([ ]*[ xX]?)\]\s([^\n]+)$/gm, (match, checked, content) => {
                return `<li><input type="checkbox" ${checked.trim().toLowerCase() === 'x' ? 'checked' : ''} disabled> ${content}</li>`;
            })

            // 无序列表
            .replace(/^[ \t]*[-\*\+] ([^\n]+)$/gm, `<li>$1</li>`)

            // 有序列表
            .replace(/^[ \t]*(\d+\.) ([^\n]+)$/gm, `<li>$1 $2</li>`)

            // 分隔线
            .replace(/^ {0,3}(([*_-])( *\2 *){2,})(?:\s*$|$)/gm, () => '<hr/>')

            // 引用块
            .replace(/^[ \t]*((?:\>[ \t]+)+)([^\n]*)$/gm, (match, sep, content) => {
                console.log(match, sep, content)
                let num = sep.length / 2;
                console.log(num);
                if (content.trim() === '') return '';
                return "<blockquote>".repeat(num) + content + "</blockquote>".repeat(num);
            })

            // 表格
            .replace(/^([^\n]*\|[^\n]*)\n([-:| ]+\|)+[-\| ]*\n((?:[^\n]*\|[^\n]*(?:\n|$))*)/gm, (match, headers, align, rows) => {
                return this.parseTable(headers, align, rows);
            })

            // 段落处理
            .split(/\n{2,}|\\\n/g)
            .map(s => /^<(\w+)/.test(s) ? s : `<p>${s}</p>`)
            .join('<br />');
    }

    /**
     * 解析表格
     * @param {Array} headers 表头
     * @param {String} alignLine 对齐方式
     * @param {Array} rows 表格行
     * @return {String}
     * @private
     */
    parseTable(headers, alignLine, rows) {
        // 解析表头
        const headerCols = headers.split('|').map(h => h.trim()).filter(Boolean);

        // 解析对齐方式
        const aligns = this.parseTableAlignment(alignLine);

        // 解析行数据（兼容列数不一致的情况）
        const bodyRows = rows.trim().split('\n').reduce((arr, line) => {
            if (!line.includes('|')) return arr;
            const cols = line.split('|').slice(1, -1).map(c => c.trim()); // 移除首尾空列
            arr.push(headerCols.map((_, i) => cols[i] || ''));  // 按表头列数填充
            return arr;
        }, []);

        // 构建表格HTML
        const table = ['<table>', '<thead><tr>'];

        // 表头处理
        headerCols.forEach((h, i) => {
            table.push(`<th${aligns[i] ? ` align="${aligns[i]}"` : ''}>${h}</th>`);
        });
        table.push('</tr></thead>');

        // 表体处理
        if (bodyRows.length) {
            table.push('<tbody>');
            bodyRows.forEach(row => {
                table.push('<tr>',
                    ...row.map((c, j) => `<td${aligns[j] ? ` align="${aligns[j]}"` : ''}>${c}</td>`),
                    '</tr>');
            });
            table.push('</tbody>');
        }

        return [...table, '</table>'].join('');
    }

    /**
     * 解析表格对齐方式
     * @param {string} alignLine
     * @returns {Array}
     * @private
     * @static
     */
    parseTableAlignment(alignLine) {
        // 解析每列的对齐方式
        return alignLine.split('|')
            .map(part => part.trim())
            .filter(Boolean)
            .map(part => {
                // 根据冒号位置确定对齐方式
                const left = part.startsWith(':');
                const right = part.endsWith(':');
                return left && right ? 'center'
                    : left ? 'left'
                        : right ? 'right'
                            : null; // 默认无特殊对齐
            });
    }

    /**
     * 解析内联表达式
     * @param {string} text
     * @return {string} 解析后的文本
     * @private
     * @static
     */
    parseInlines(text) {
        // 粗体
        return text.replace(/[\*\_]{2}(.+?)[\*\_]{2}/g, '<strong>$1</strong>')

            .replace(/(?<!\*)_(.+?)_(?!\*)|(?<!\*)\*(.+?)\*(?!\*)/, (match, g1, g2) =>
                `<em>${g1 || g2}</em>`
            )

            // 删除线
            .replace(/~~(.+?)~~/g, '<del>$1</del>')

            // 自动链接
            .replace(/<((?:https?:\/\/|ftp:\/\/|mailto:|tel:)[^>\s]+)>/g, '<a href="$1">$1</a>')
            .replace(/<([^\s@]+@[^\s@]+\.[^\s@]+)>/g, '<a href="mailto:$1">$1</a>')

            // 图片
            .replace(/\!\[([^\]]*)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1"></img>')

            // 链接
            .replace(/\[([^\]]+)\]\(([^\) ]+)[ ]?(\"[^\)\"]+\")?\)/g, (match, desc, url, title) => `<a href="${url}"${(title) ? " title=" + title : ""}>${desc}</a>`);
    }

    /**
     * 转义 HTML 字符串
     * @param {string} text
     * @returns {string}
     */
    escapeHTML(text) {
        return text.replace(/[&<>"']/g, m => this.escapeMap[m])
    }

    /**
     * 安全化 HTML 字符串
     * @param {string} text
     * @returns {string}
     */
    safeHTML(text) {
        return text
            .replace(/<(\/?)\s*(script|iframe|object|embed|frame|link|meta|style|svg|math)[^>]*>/gi, m => this.escapeHTML(m))
            .replace(/\s(?!data-)[\w-]+=\s*["'\s]*(javascript:|data:)[^"'\s>]*/gi, '');
    }
}