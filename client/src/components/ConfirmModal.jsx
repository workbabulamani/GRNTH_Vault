import { useEffect, useRef } from 'react';

export default function ConfirmModal({ title, message, onConfirm, onCancel, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) {
    const confirmRef = useRef(null);

    useEffect(() => {
        confirmRef.current?.focus();
        const handleKey = (e) => {
            if (e.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onCancel]);

    return (
        <div className="modal-overlay" onClick={onCancel} style={{ zIndex: 3000 }}>
            <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
                <h3 style={{ margin: '0 0 8px', fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>{title}</h3>
                <p style={{ margin: '0 0 20px', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{message}</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={onCancel}>{cancelLabel}</button>
                    <button
                        ref={confirmRef}
                        className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
