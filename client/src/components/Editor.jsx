import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState, Prec } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import { useTheme } from '../context/ThemeContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { api } from '../api/client.js';

// Auto-pair map: opening char -> closing char
const AUTO_PAIRS = {
    '[': ']',
    '(': ')',
    '{': '}',
    '"': '"',
    "'": "'",
    '`': '`',
};
// Symmetric pairs where open === close
const SYMMETRIC = new Set(['"', "'", '`']);

// Custom keymap for auto-pairs and fenced code block auto-close
// Uses Prec.highest so our handlers run before CodeMirror defaults
function makeAutoPairKeymap() {
    const bindings = [];

    for (const [open, close] of Object.entries(AUTO_PAIRS)) {
        bindings.push({
            key: open,
            run(view) {
                const { state } = view;
                const { from, to } = state.selection.main;
                const selectedText = state.doc.sliceString(from, to);
                const nextChar = state.doc.sliceString(from, from + 1);

                // Special handling for backtick: detect ``` to create fenced block
                if (open === '`') {
                    const line = state.doc.lineAt(from);
                    const lineText = state.doc.sliceString(line.from, from);
                    if (lineText === '``' && nextChar !== '`') {
                        // If text is selected, wrap it in a fenced code block
                        if (selectedText) {
                            // Replace the two backticks already typed + selected text with a full fenced block
                            const insert = `\`\n${selectedText}\n\`\`\``;
                            view.dispatch({
                                changes: { from: line.from, to, insert: '```\n' + selectedText + '\n```' },
                                selection: { anchor: line.from + 4, head: line.from + 4 + selectedText.length },
                            });
                        } else {
                            const insert = `\`\n\n\`\`\``;
                            view.dispatch({
                                changes: { from, to, insert },
                                selection: { anchor: from + 2 },
                            });
                        }
                        return true;
                    }
                    if (SYMMETRIC.has(open) && nextChar === close && !selectedText) {
                        view.dispatch({ selection: { anchor: from + 1 } });
                        return true;
                    }
                }

                if (SYMMETRIC.has(open) && nextChar === close && !selectedText) {
                    view.dispatch({ selection: { anchor: from + 1 } });
                    return true;
                }

                if (selectedText) {
                    view.dispatch({
                        changes: { from, to, insert: open + selectedText + close },
                        selection: { anchor: from + 1, head: to + 1 },
                    });
                } else {
                    view.dispatch({
                        changes: { from, to, insert: open + close },
                        selection: { anchor: from + 1 },
                    });
                }
                return true;
            }
        });

        if (open !== close) {
            bindings.push({
                key: close,
                run(view) {
                    const { state } = view;
                    const { from, to } = state.selection.main;
                    if (from === to) {
                        const nextChar = state.doc.sliceString(from, from + 1);
                        if (nextChar === close) {
                            view.dispatch({ selection: { anchor: from + 1 } });
                            return true;
                        }
                    }
                    return false;
                }
            });
        }
    }

    bindings.push({
        key: 'Backspace',
        run(view) {
            const { state } = view;
            const { from, to } = state.selection.main;
            if (from !== to) return false;
            if (from < 1) return false;
            const prevChar = state.doc.sliceString(from - 1, from);
            const nextChar = state.doc.sliceString(from, from + 1);
            if (AUTO_PAIRS[prevChar] !== undefined && AUTO_PAIRS[prevChar] === nextChar) {
                view.dispatch({
                    changes: { from: from - 1, to: from + 1, insert: '' },
                    selection: { anchor: from - 1 },
                });
                return true;
            }
            return false;
        }
    });

    return Prec.highest(keymap.of(bindings));
}

const Editor = forwardRef(function Editor({ content, onChange, onScroll }, ref) {
    const editorRef = useRef(null);
    const viewRef = useRef(null);
    const { theme } = useTheme();
    const { addToast } = useApp();
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const addToastRef = useRef(addToast);
    addToastRef.current = addToast;
    const onScrollRef = useRef(onScroll);
    onScrollRef.current = onScroll;
    const isSyncingRef = useRef(false);

    useImperativeHandle(ref, () => ({
        getView: () => viewRef.current,
        scrollToPercent(pct) {
            const view = viewRef.current;
            if (!view) return;
            isSyncingRef.current = true;
            const scroller = view.scrollDOM;
            const maxScroll = scroller.scrollHeight - scroller.clientHeight;
            scroller.scrollTop = maxScroll * pct;
            requestAnimationFrame(() => { isSyncingRef.current = false; });
        },
    }));

    useEffect(() => {
        if (!editorRef.current) return;

        const extensions = [
            lineNumbers(),
            highlightActiveLine(),
            highlightActiveLineGutter(),
            history(),
            bracketMatching(),
            markdown({ base: markdownLanguage, codeLanguages: languages }),
            syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
            makeAutoPairKeymap(),

            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    onChangeRef.current(update.state.doc.toString());
                }
            }),
            EditorView.lineWrapping,
            EditorView.domEventHandlers({
                paste(event, view) {
                    const items = event.clipboardData?.items;
                    if (!items) return false;
                    for (const item of items) {
                        if (item.type.startsWith('image/')) {
                            event.preventDefault();
                            const file = item.getAsFile();
                            if (!file) return true;
                            api.uploadImage(file).then((data) => {
                                const imageMarkdown = `![image](${data.url})`;
                                const { from } = view.state.selection.main;
                                view.dispatch({ changes: { from, insert: imageMarkdown } });
                                addToastRef.current('Image uploaded');
                            }).catch(() => {
                                addToastRef.current('Image upload failed');
                            });
                            return true;
                        }
                    }
                    return false;
                }
            }),
        ];

        const darkThemes = ['dark', 'github-dark', 'high-contrast', 'solarized-dark', 'nord'];
        if (darkThemes.includes(theme)) {
            extensions.push(oneDark);
        } else {
            extensions.push(EditorView.theme({
                '&': { backgroundColor: 'var(--bg-editor)' },
                '.cm-content': { caretColor: 'var(--text-primary)' },
                '.cm-cursor': { borderLeftColor: 'var(--text-primary)' },
            }));
        }

        const state = EditorState.create({
            doc: content || '',
            extensions,
        });

        const view = new EditorView({
            state,
            parent: editorRef.current,
        });

        viewRef.current = view;

        // Scroll sync: emit scroll percentage to parent
        const scroller = view.scrollDOM;
        const handleEditorScroll = () => {
            if (isSyncingRef.current) return;
            const maxScroll = scroller.scrollHeight - scroller.clientHeight;
            if (maxScroll <= 0) return;
            const pct = scroller.scrollTop / maxScroll;
            onScrollRef.current?.(pct);
        };
        scroller.addEventListener('scroll', handleEditorScroll, { passive: true });

        return () => {
            scroller.removeEventListener('scroll', handleEditorScroll);
            view.destroy();
            viewRef.current = null;
        };
    }, [theme]);

    useEffect(() => {
        if (viewRef.current) {
            const currentContent = viewRef.current.state.doc.toString();
            if (content !== currentContent) {
                viewRef.current.dispatch({
                    changes: { from: 0, to: currentContent.length, insert: content || '' }
                });
            }
        }
    }, [content]);

    return <div ref={editorRef} style={{ height: '100%', overflow: 'hidden' }} />;
});

export default Editor;
