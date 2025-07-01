/**
 * MiniGFM - 一个简单的Markdown解析器，基本支持GFM语法。
 * @author OblivionOcean
 * @version 0.0.1
 * @class
 */
export class MiniGFM {
    /**
     * Markdown语法正则表达式
     * @static
     * @type {Object}
     * @property {RegExp} code 代码块
     * @property {RegExp} link 链接
     * @property {RegExp} image 图片
     * @property {RegExp} bold 粗体
     * @property {RegExp} italic 斜体
     * @property {RegExp} strikethrough 删除线
     * @property {RegExp} quote 引用
     * @property {RegExp} list 列表
     * @property {RegExp} heading 标题
     * @property {RegExp} code 代码
     * @property {RegExp} codeblock 代码块
     * @static
     * @private
     */
    patterns = {
        codeBlock: /(?:^|\n)```([\s\S]*?)\n([\s\S]*?)\n```/g,
        inlineCode: /`([^`]+)`/g,
        bold: /\*\*(.+?)\*\*/g,
        italic: /(?<!\*)_(.+?)_(?!\*)|(?<!\*)\*(.+?)\*(?!\*)/g,
        strike: /~~(.+?)~~/g,
        heading: /^[^\\]\s*(#{1,6}) (.+)$/gm,
        unorderedList: /^([ ]{0,3})[-*+] ([^-\_\*]+)$/gm,
        orderedList: /^([ ]{0,3})\d+\. ([^-\_\*])$/gm,
        taskList: /^([ ]{0,3})[-*+] \[([ xX]?)\]\s([^-\_\*]+)$/gm,
        blockquote: /^> (.+)$/gm,
        table: /^([^\n]*\|[^\n]*)\n([-:| ]+\|)+[-\| ]*\n((?:[^\n]*\|[^\n]*(?:\n|$))*)/gm,
        link: /\[([^\]]+)\]\(([^\)]+)\)/g,
        image: /!\[([^\]]+)\]\(([^\)]+)\)/g,
        autoLink: /<((?:https?:\/\/|ftp:\/\/|mailto:|tel:)[^>\s]+)>/g,
        autoEmail: /<([^\s@]+@[^\s@]+\.[^\s@]+)>/g,
        hr: /^ {0,3}(([*_-])( *\2 *){2,})(?:\s*$|$)/gm,
        escape: /\\([\\`*_{}[\]()#+\-.!])/g,
        paragraphSplit: /\\\n|\n{2,}/g,
    };

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
        '`': '&#96;'
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
        // 转义特殊字符
        markdown = this.escape(markdown);

        if (this.options.unsafe) {
            markdown = this.escapeHTML(markdown);
        }

        // 保存原始代码块
        const codeBlocks = [];
        markdown = markdown.replace(this.patterns.codeBlock, (match, lang, code) => {
            codeBlocks.push({ lang: lang, code: code.trim() });
            return `<!----CODEBLOCK${codeBlocks.length - 1}---->`;
        });

        // 解析块级元素
        markdown = this.parseBlocks(markdown);

        // 解析行内元素
        markdown = this.parseInlines(markdown);

        // 恢复代码块
        markdown = markdown.replace(/<!----CODEBLOCK(\d+)---->/g, (match, id) => {
            if (!codeBlocks[parseInt(id)]) return '';
            let codeBlock = codeBlocks[parseInt(id)]
            if (codeBlock.lang) {
                if (this.options.hljs) {
                    codeBlock.code = this.options.hljs.highlight(codeBlock.code, { language: codeBlock.lang }).value;
                }
                return `<pre><code class="hljs ${codeBlock.lang} lang-${codeBlock.lang}">${codeBlock.code}</code></pre>`
            } else {
                if (this.options.hljs) {
                    codeBlock.code = this.options.hljs.highlightAuto(codeBlock.code).value;
                }
                return `<pre><code>${codeBlock.code}</code></pre>`
            }
        });

        return markdown;
    }

    /**
     * 转义特殊字符
     * @param {string} text - 待处理的文本
     * @returns {string} 转义后的文本
     */
    escape(text) {
        return text.replace(this.patterns.escape, '$1');
    }

    /**
     * 解析跨行元素和行级块
     * @param {string} text - 待处理的文本
     * @returns {string} 处理后的文本
     * @private
     * @static
     */
    parseBlocks(text) {
        // 标题
        text = text.replace(this.patterns.heading, (match, level, content) => {
            return `<h${level.length}>${content}</h${level.length}>`;
        });

        // 任务列表
        text = text.replace(this.patterns.taskList, (match, indent, checked, content) => {
            const isChecked = checked.trim().toLowerCase() === 'x';
            return `${indent}<li><input type="checkbox" ${isChecked ? 'checked' : ''} disabled> ${content}</li>`;
        });

        // 无序列表
        text = text.replace(this.patterns.unorderedList, (match, indent, content) => {
            return `${indent}<li>${content}</li>`;
        });

        // 有序列表
        text = text.replace(this.patterns.orderedList, (match, indent, content) => {
            return `${indent}<li>${content}</li>`;
        });

        // 分隔线
        text = text.replace(this.patterns.hr, () => '<hr>');

        // 引用块
        text = text.replace(this.patterns.blockquote, (match, content) => {
            return `<blockquote>${content}</blockquote>`;
        });

        // 表格
        text = text.replace(this.patterns.table, (match, headers, align, rows) => {
            return this.parseTable(headers, align, rows);
        });

        // 段落处理
        const chunks = text.split(this.patterns.paragraphSplit);
        return chunks.map(chunk => {
            if (!chunk.startsWith('<') && !chunk.match(/^<[a-z]+/i)) {
                return `<p>${chunk}</p>`;
            }
            return chunk;
        }).join('<br />');
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
        const headerColumns = headers.split('|').map(h => h.trim()).filter(h => h);

        // 解析对齐方式（改进对齐解析）
        const alignments = this.parseTableAlignment(alignLine);

        // 解析行数据
        const rowData = [];
        const rowLines = rows.trim().split('\n');

        for (const line of rowLines) {
            if (line.match(this.patterns.tableRow)) {
                const parts = line.split('|').map(c => c.trim());
                // 确保列数与表头一致
                const columns = [];
                for (let i = 0; i < headerColumns.length; i++) {
                    columns.push(parts[i] || ''); // 填充空单元格
                }
                rowData.push(columns);
            }
        }

        // 构建表格HTML
        let html = '<table>';

        // 表头
        html += '<thead><tr>';
        headerColumns.forEach((header, i) => {
            const align = alignments[i] ? ` align="${alignments[i]}"` : '';
            html += `<th${align}>${this.escapeHTML(header)}</th>`;
        });
        html += '</tr></thead>';

        // 表体
        if (rowData.length > 0) {
            html += '<tbody>';
            rowData.forEach(row => {
                html += '<tr>';
                row.forEach((cell, j) => {
                    const align = alignments[j] ? ` align="${alignments[j]}"` : '';
                    html += `<td${align}>${this.escapeHTML(cell)}</td>`;
                });
                html += '</tr>';
            });
            html += '</tbody>';
        }
        html += '</table>';

        return html;
    }

    /**
     * 解析表格对齐方式
     * @param {string} alignLine
     * @returns {Array}
     * @private
     * @static
     */
    parseTableAlignment(alignLine) {
        const alignments = [];
        const parts = alignLine.split('|').map(p => p.trim());

        for (const part of parts) {
            if (!part) continue; // 跳过空部分

            // 处理不同对齐格式
            if (part.startsWith(':') && part.endsWith(':')) {
                alignments.push('center');
            } else if (part.startsWith(':')) {
                alignments.push('left');
            } else if (part.endsWith(':')) {
                alignments.push('right');
            } else {
                alignments.push(null); // 默认对齐
            }
        }

        return alignments;
    }

    /**
     * 解析内联表达式
     * @param {string} text
     * @return {string} 解析后的文本
     * @private
     * @static
     */
    parseInlines(text) {
        // 行内代码
        text = text.replace(this.patterns.inlineCode, '<code>$1</code>');

        // 粗体
        text = text.replace(this.patterns.bold, '<strong>$1</strong>');

        // 斜体
        text = text.replace(this.patterns.italic, (match, g1, g2) =>
            `<em>${g1 || g2}</em>`
        );

        // 删除线
        text = text.replace(this.patterns.strike, '<del>$1</del>');

        // 自动链接
        text = text.replace(this.patterns.autoLink, '<a href="$1">$1</a>');
        text = text.replace(this.patterns.autoEmail, '<a href="mailto:$1">$1</a>');

        // 链接
        text = text.replace(this.patterns.link, '<a href="$2">$1</a>');

        // 图片
        text = text.replace(this.patterns.image, '<img src="$2" alt="$1"></img>');

        return text;
    }

    /**
     * 转义 HTML 字符串
     * @param {string} text
     * @returns {string}
     */
    escapeHTML(text) {
        return text.replace(/[&<>"']/g, m => this.escapeMap[m]);
    }
}