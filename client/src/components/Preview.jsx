import { useMemo } from 'react';
import { renderMarkdown } from '../utils/markdown.js';

export default function Preview({ content }) {
    const html = useMemo(() => renderMarkdown(content || ''), [content]);

    return (
        <div
            className="md-preview"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
