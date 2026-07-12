import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  open:          boolean;
  onClose:       () => void;
  title:         string;
  description?:  string;
  children:      React.ReactNode;
  footer?:       React.ReactNode;
  size?:         'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = { sm: 480, md: 600, lg: 780, xl: 960 };

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else {
      if (el.open) el.close();
    }
  }, [open]);

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDialogElement>) => {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (
      e.clientX < rect.left || e.clientX > rect.right ||
      e.clientY < rect.top  || e.clientY > rect.bottom
    ) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdrop}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      style={{
        border: 'none',
        borderRadius: 'var(--radius-xl)',
        padding: 0,
        maxWidth: sizeMap[size],
        width: `calc(100vw - 48px)`,
        background: 'var(--color-bg-surface)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px var(--color-border)',
        color: 'var(--color-text-primary)',
        animation: 'fadeInScale 0.2s ease both',
      }}
    >
      {/* Backdrop */}
      <style>{`
        dialog::backdrop {
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: 'var(--space-6)',
          borderBottom: '1px solid var(--color-border)',
          gap: 'var(--space-4)',
        }}
      >
        <div>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, lineHeight: 1.3 }}>{title}</h2>
          {description && (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
              {description}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            flexShrink: 0,
            width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            border: 'none',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-elevated)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-muted)';
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: 'var(--space-6)', overflowY: 'auto', maxHeight: '65vh' }}>
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div
          style={{
            padding: 'var(--space-4) var(--space-6)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--space-3)',
          }}
        >
          {footer}
        </div>
      )}
    </dialog>
  );
}

// ─── Confirm Dialog ────────────────────────────────────────────────────────

interface ConfirmModalProps {
  open:         boolean;
  onClose:      () => void;
  onConfirm:    () => void;
  title:        string;
  message:      string;
  confirmLabel?: string;
  danger?:      boolean;
  loading?:     boolean;
}

export function ConfirmModal({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', danger = false, loading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>{message}</p>
    </Modal>
  );
}
