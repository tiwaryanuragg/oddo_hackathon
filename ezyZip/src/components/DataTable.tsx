import React, { useState } from "react";

interface DataTableProps<T> {
  columns: { header: string; accessor: keyof T | string; render?: (item: T) => React.ReactNode }[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export default function DataTable<T extends Record<string, unknown>>({ columns, data, keyExtractor, onRowClick, emptyMessage = "No records found" }: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof T] as any;
      const bValue = b[sortConfig.key as keyof T] as any;
      
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[var(--border)] glass">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[var(--elevated)] border-b border-[var(--border)]">
            {columns.map((col, index) => (
              <th 
                key={index} 
                className="px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider cursor-pointer hover:text-white transition-colors"
                onClick={() => requestSort(col.accessor as string)}
              >
                <div className="flex items-center gap-1">
                  {col.header}
                  {sortConfig?.key === col.accessor && (
                    <span className="text-[10px]">{sortConfig.direction === "asc" ? "▲" : "▼"}</span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((item) => (
              <tr 
                key={keyExtractor(item)} 
                onClick={() => onRowClick && onRowClick(item)}
                className={`border-b border-[var(--border)] last:border-0 hover:bg-[var(--elevated)] transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
              >
                {columns.map((col, index) => (
                  <td key={index} className="px-4 py-3 text-sm text-white">
                    {col.render ? col.render(item) : (item[col.accessor as keyof T] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
