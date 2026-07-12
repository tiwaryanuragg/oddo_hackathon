import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page:       number;
  totalPages: number;
  onPage:     (page: number) => void;
  hasNext:    boolean;
  hasPrev:    boolean;
  total:      number;
  limit:      number;
}

export function Pagination({ page, totalPages, onPage, hasNext, hasPrev, total, limit }: PaginationProps) {
  const from = Math.min((page - 1) * limit + 1, total);
  const to   = Math.min(page * limit, total);

  // Build page number array with ellipsis
  const pages: (number | 'ellipsis')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('ellipsis');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
  }

  const btnBase: React.CSSProperties = {
    width: 34, height: 34,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-sm)',
    fontWeight: 500,
    cursor: 'pointer',
    border: '1px solid var(--color-border)',
    transition: 'all var(--transition-fast)',
    background: 'transparent',
    color: 'var(--color-text-secondary)',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-4)',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
        Showing <strong style={{ color: 'var(--color-text-primary)' }}>{from}–{to}</strong> of{' '}
        <strong style={{ color: 'var(--color-text-primary)' }}>{total}</strong> results
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={() => onPage(page - 1)}
          disabled={!hasPrev}
          aria-label="Previous page"
          style={{ ...btnBase, opacity: !hasPrev ? 0.4 : 1, cursor: !hasPrev ? 'not-allowed' : 'pointer' }}
          onMouseEnter={(e) => { if (hasPrev) e.currentTarget.style.background = 'var(--color-bg-elevated)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e-${i}`} style={{ color: 'var(--color-text-muted)', padding: '0 4px', fontSize: 'var(--text-sm)' }}>
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              aria-current={p === page ? 'page' : undefined}
              style={{
                ...btnBase,
                background: p === page ? 'var(--color-accent)' : 'transparent',
                borderColor: p === page ? 'var(--color-accent)' : 'var(--color-border)',
                color: p === page ? '#fff' : 'var(--color-text-secondary)',
                cursor: p === page ? 'default' : 'pointer',
              }}
              onMouseEnter={(e) => { if (p !== page) e.currentTarget.style.background = 'var(--color-bg-elevated)'; }}
              onMouseLeave={(e) => { if (p !== page) e.currentTarget.style.background = 'transparent'; }}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => onPage(page + 1)}
          disabled={!hasNext}
          aria-label="Next page"
          style={{ ...btnBase, opacity: !hasNext ? 0.4 : 1, cursor: !hasNext ? 'not-allowed' : 'pointer' }}
          onMouseEnter={(e) => { if (hasNext) e.currentTarget.style.background = 'var(--color-bg-elevated)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
