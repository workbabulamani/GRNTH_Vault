import markdownIt from 'markdown-it';
import hljs from 'highlight.js';

const md = markdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight: (str, lang) => {
        const langLabel = lang || 'text';
        const langClass = lang && hljs.getLanguage(lang) ? lang : '';
        let highlighted;
        if (langClass) {
            try {
                highlighted = hljs.highlight(str, { language: langClass, ignoreIllegals: true }).value;
            } catch (_) {
                highlighted = md.utils.escapeHtml(str);
            }
        } else {
            highlighted = md.utils.escapeHtml(str);
        }
        return `<div class="code-block-wrapper"><div class="code-block-header"><span class="code-lang-label">${langLabel}</span><button class="code-copy-btn" onclick="(function(btn){var code=btn.closest('.code-block-wrapper').querySelector('code').textContent;navigator.clipboard.writeText(code);btn.classList.add('copied');btn.setAttribute('title','Copied!');setTimeout(function(){btn.classList.remove('copied');btn.setAttribute('title','Copy')},2000)})(this)" title="Copy"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button></div><pre><code class="hljs ${langClass}">${highlighted}</code></pre></div>`;
    }
});

// Open all links in new tab
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    tokens[idx].attrSet('target', '_blank');
    tokens[idx].attrSet('rel', 'noopener noreferrer');
    return self.renderToken(tokens, idx, options);
};

// Task list plugin
md.core.ruler.after('inline', 'task-lists', (state) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type === 'inline') {
            const content = tokens[i].content;
            if (/^\[[ x]\] /.test(content)) {
                const checked = content[1] === 'x';
                tokens[i].content = content.slice(4);
                tokens[i].children = md.parseInline(tokens[i].content, state.md, state.env)[0].children;

                // Find parent list item
                if (i > 0 && tokens[i - 1].type === 'paragraph_open') {
                    for (let j = i - 2; j >= 0; j--) {
                        if (tokens[j].type === 'list_item_open') {
                            tokens[j].attrSet('class', 'task-list-item');
                            break;
                        }
                    }
                }
                const checkboxHtml = `<input type="checkbox" ${checked ? 'checked' : ''} disabled /> `;
                tokens[i].children.unshift({
                    type: 'html_inline',
                    content: checkboxHtml,
                    tag: '',
                    attrs: null,
                    map: null,
                    nesting: 0,
                    level: 0,
                    children: null,
                    markup: '',
                    info: '',
                    meta: null,
                    block: false,
                    hidden: false,
                });
            }
        }
    }
});

export function renderMarkdown(content) {
    if (!content) return '';
    return md.render(content);
}
