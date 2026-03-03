import { useEffect, useRef, useCallback } from 'react';
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
                        // Third backtick typed at start of line -> fenced code block
                        // Insert: `\n\n``` (cursor lands on blank line)
                        const insert = `\`\n\n\`\`\``;
                        view.dispatch({
                            changes: { from, to, insert },
                            selection: { anchor: from + 2 }, // after the newline, on blank line
                        });
                        return true;
                    }
                    // For backtick: if next char is also backtick, skip over it
                    if (SYMMETRIC.has(open) && nextChar === close && !selectedText) {
                        view.dispatch({ selection: { anchor: from + 1 } });
                        return true;
                    }
                }

                // For symmetric pairs: if next char is already the closing char, skip over it
                if (SYMMETRIC.has(open) && nextChar === close && !selectedText) {
                    view.dispatch({ selection: { anchor: from + 1 } });
                    return true;
                }

                if (selectedText) {
                    // Wrap selected text in the pair
                    view.dispatch({
                        changes: { from, to, insert: open + selectedText + close },
                        selection: { anchor: from + 1, head: to + 1 },
                    });
                } else {
                    // Insert pair and place cursor between them
                    view.dispatch({
                        changes: { from, to, insert: open + close },
                        selection: { anchor: from + 1 },
                    });
                }
                return true;
            }
        });

        // For asymmetric pairs: handle pressing the closing char to skip over it
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

    // Handle Backspace: delete BOTH chars when cursor is between a pair
    bindings.push({
        key: 'Backspace',
        run(view) {
            const { state } = view;
            const { from, to } = state.selection.main;
            if (from !== to) return false; // has selection, don't intercept
            if (from < 1) return false;
            const prevChar = state.doc.sliceString(from - 1, from);
            const nextChar = state.doc.sliceString(from, from + 1);
            if (AUTO_PAIRS[prevChar] !== undefined && AUTO_PAIRS[prevChar] === nextChar) {
                // Cursor is between an auto-pair: delete both
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


// Auto-pair map: opening char -> closing char
const AUTO_PAIRS = {
    '[': ']',
    '(': ')',
    '{': '}',
    '"': '"',
    "'": "'",
    '`': '`',
};

// Custom keymap for auto-pairs and fenced code block auto-close
function makeAutoPairKeymap() {
    const bindings = [];

    for (const [open, close] of Object.entries(AUTO_PAIRS)) {
        bindings.push({
            key: open,
            run(view) {
                const { state } = view;
                const { from, to } = state.selection.main;
                const selectedText = state.doc.sliceString(from, to);

                // Special handling for backtick: detect ``` to create fenced block
                if (open === '`') {
                    // Get current line text up to cursor
                    const line = state.doc.lineAt(from);
                    const lineText = state.doc.sliceString(line.from, from);
                    if (lineText === '``') {
                        // User just typed third backtick - create fenced code block
                        const insertion = `\`\n\n\`\`\``;
                        view.dispatch({
                            changes: { from, to, insert: insertion },
                            selection: { anchor: from + 1 + 1 }, // put cursor on blank line
                        });
                        return true;
                    }
                }

                if (selectedText) {
                    // Wrap selected text
                    view.dispatch({
                        changes: { from, to, insert: open + selectedText + close },
                        selection: { anchor: from + 1, head: to + 1 },
                    });
                } else {
                    // Insert pair and place cursor between them
                    view.dispatch({
                        changes: { from, to, insert: open + close },
                        selection: { anchor: from + 1 },
                    });
                }
                return true;
            }
        });

        // Handle pressing the closing char: skip over it if it's already there
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

    // Handle Backspace: delete pair if cursor is between opening+closing
    bindings.push({
        key: 'Backspace',
        run(view) {
            const { state } = view;
            const { from, to } = state.selection.main;
            if (from !== to) return false;
            const prevChar = state.doc.sliceString(from - 1, from);
            const nextChar = state.doc.sliceString(from, from + 1);
            if (AUTO_PAIRS[prevChar] === nextChar) {
                view.dispatch({
                    changes: { from: from - 1, to: from + 1, insert: '' },
                    selection: { anchor: from - 1 },
                });
                return true;
            }
            return false;
        }
    });

    return keymap.of(bindings);
}

export default function Editor({ content, onChange }) {
    const editorRef = useRef(null);
    const viewRef = useRef(null);
    const { theme } = useTheme();
    const { addToast } = useApp();
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const addToastRef = useRef(addToast);
    addToastRef.current = addToast;

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
            // Handle image paste via CodeMirror's event system
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
                            return true; // Handled — don't propagate
                        }
                    }
                    return false; // Not handled — let CodeMirror handle text paste normally
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

        return () => {
            view.destroy();
            viewRef.current = null;
        };
    }, [theme]); // Recreate editor when theme changes

    // Sync content from outside (switching tabs)
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
}
