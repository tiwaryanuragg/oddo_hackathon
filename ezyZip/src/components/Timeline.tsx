import React from "react";
import { format } from "date-fns";

interface TimelineEvent {
  title: string;
  date: Date;
  description: string;
  status?: string;
}

export default function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events || events.length === 0) {
    return <div className="text-sm text-[var(--text-secondary)] italic">No history available.</div>;
  }

  return (
    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-3 before:-translate-x-px md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[var(--border)] before:to-transparent">
      {events.map((event, idx) => (
        <div key={idx} className="relative flex items-center gap-4 group">
          <div className="flex items-center justify-center w-6 h-6 rounded-full border border-[var(--border)] bg-[var(--card)] shrink-0 shadow z-10">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
          </div>
          <div className="flex-1 p-4 rounded-xl border border-[var(--border)] bg-[var(--elevated)] shadow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 gap-2">
              <span className="font-semibold text-white text-sm">{event.title}</span>
              <span className="text-xs text-[var(--text-secondary)]">
                {format(new Date(event.date), 'MMM d, yyyy')}
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {event.description}
            </p>
            {event.status && (
              <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20">
                {event.status}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
