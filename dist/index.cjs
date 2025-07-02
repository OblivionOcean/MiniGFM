/**
 * MiniGFM - 一个简单的Markdown解析器，基本支持GFM语法。
 * @author OblivionOcean
 * @version 0.0.8
 * @class
 */
class MiniGFM {
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
        // 转义特殊字符
        markdown = this.escape(markdown);

        if (!this.options.unsafe) {
            markdown = this.escapeHTML(markdown);
        }

        // 保存原始代码块
        const codeBlocks = [];
        const codeInline = [];
        markdown = markdown.replace(/(?:^|\n)(`{3,4})([A-Za-z0-9]*?)\n([\s\S]*?)\n\1/g, (match, _, lang, code) => {
            codeBlocks.push({ lang: lang, code: code.trim() });
            return `<!----CODEBLOCK${codeBlocks.length - 1}---->`;
        })
            // 保持内联代码   
            .replace(/`([^`]+)`/g, (match, code) => {
                codeInline.push(code);
                return `<!----CODEINLINE${codeInline.length - 1}---->`;
            })

            // 删除注释
            .replace(/\%\%[\n ][^\%]+[\n ]\%\%/g, '');

        // 解析块级元素
        markdown = this.parseBlocks(markdown);

        // 解析行内元素
        markdown = this.parseInlines(markdown);

        // 恢复代码行级元素
        markdown = markdown.replace(/<!----CODEINLINE(\d+)---->/g, (match, id) => {
            if (!codeInline[parseInt(id)]) return '';
            return `<code>${codeInline[parseInt(id)]}</code>`;
        })

        // 恢复代码块
        .replace(/<!----CODEBLOCK(\d+)---->/g, (match, id) => {
            if (!codeBlocks[parseInt(id)]) return '';
            let codeBlock = codeBlocks[parseInt(id)]
            codeBlock.lang = codeBlock.lang.trim();
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
        return text.replace(/\\([\\*_{}[\]()#+\-.!])/g, '$1');
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
        text = text.replace(/^[^\\]\s*(#{1,6}) (.+)$/gm, (match, level, content) => {
            return `<h${level.length}>${content}</h${level.length}>`;
        })

            // 任务列表
            .replace(/^[ \t]*[-\*\+] \[([ xX]?)\]\s([^-\_\*]+)$/gm, (match, indent, checked, content) => {
                const isChecked = checked.trim().toLowerCase() === 'x';
                return `${indent}<li><input type="checkbox" ${isChecked ? 'checked' : ''} disabled> ${content}</li>`;
            })

            // 无序列表
            .replace(/^[ \t]*[-\*\+] ([^-\_\*]+)$/gm, (match, content) => {
                return `<li>${content}</li>`;
            })

            // 有序列表
            .replace(/^[ \t]*(\d+)\. ([^-\_\*]+)$/gm, (match, indent, content) => {
                return `<li>${indent}. ${content}</li>`;
            })

            // 分隔线
            .replace(/^ {0,3}(([*_-])( *\2 *){2,})(?:\s*$|$)/gm, () => '<hr>')

            // 引用块
            .replace(/^((?:\&gt\; ?)+)( *.*)$/gm, (match, sep, content) => {
                let num = sep.replaceAll("&gt;", ">").length;
                if (content.trim() === '') return '';
                return "<blockquote>".repeat(num) + content + "</blockquote>".repeat(num);
            })

            // 表格
            .replace(/^([^\n]*\|[^\n]*)\n([-:| ]+\|)+[-\| ]*\n((?:[^\n]*\|[^\n]*(?:\n|$))*)/gm, (match, headers, align, rows) => {
                return this.parseTable(headers, align, rows);
            });

        // 段落处理
        const chunks = text.split(/\\\n|\n{2,}/g);
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
            if (/^|(?:[^\|]+\|+)+$/.test(line)) {
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
            html += `<th${align}>${header}</th>`;
        });
        html += '</tr></thead>';

        // 表体
        if (rowData.length > 0) {
            html += '<tbody>';
            rowData.forEach(row => {
                html += '<tr>';
                row.forEach((cell, j) => {
                    const align = alignments[j] ? ` align="${alignments[j]}"` : '';
                    html += `<td${align}>${cell}</td>`;
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
        // 粗体
        text = text.replace(/[\*\_]{2}(.+?)[\*\_]{2}/g, '<strong>$1</strong>')

            .replace(/(?<!\*)_(.+?)_(?!\*)|(?<!\*)\*(.+?)\*(?!\*)/, (match, g1, g2) =>
                `<em>${g1 || g2}</em>`
            )

            // 删除线
            .replace(/~~(.+?)~~/g, '<del>$1</del>')

            // 自动链接
            .replace(/(?:<|\&lt\;)((?:https?:\/\/|ftp:\/\/|mailto:|tel:)[^>\s]+)(?:>|\&gt\;)/g, '<a href="$1">$1</a>')
            .replace(/(?:<|\&lt\;)([^\s@]+@[^\s@]+\.[^\s@]+)(?:>|\&gt\;)/g, '<a href="mailto:$1">$1</a>')

            // 图片
            .replace(/\!\[([^\]]*)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1"></img>')

            // 链接
            .replace(/\[([^\]]+)\]\(([^\) ]+)[ ]?(\&quot\;[^\)\"]+\&quot\;)?\)/g, (match, desc, url, title) => `<a href="${url}"${(title) ? " title=" + title.replaceAll("&quot;", "\"") : ""}>${desc}</a>`);

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


if (typeof exports === "object") {
    module.exports = { MiniGFM: MiniGFM };
}