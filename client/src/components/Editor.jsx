import { useEffect, useRef, useCallback } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import { useTheme } from '../context/ThemeContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { api } from '../api/client.js';

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
