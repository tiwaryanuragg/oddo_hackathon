"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Modal from "@/components/Modal";
import Badge from "@/components/Badge";
import { Plus, ChevronLeft, ChevronRight, AlertCircle, Clock } from "lucide-react";
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";

export default function BookingsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]); // Only bookable assets
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [conflictMessage, setConflictMessage] = useState("");

  const fetchData = async () => {
    try {
      const [bookRes, assetRes] = await Promise.all([
        fetch(`/api/bookings?date=${format(currentDate, 'yyyy-MM-dd')}`),
        fetch("/api/assets")
      ]);
      setBookings(await bookRes.json());
      
      const allAssets = await assetRes.json();
      setAssets(allAssets.filter((a: any) => a.isBookable));
    } catch (error) {
      console.error("Failed to fetch", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  // Generate Week view
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Group bookings by asset
  const bookingsByAsset = useMemo(() => {
    const map = new Map();
    assets.forEach((a: any) => map.set(a._id, []));
    
    bookings.forEach((b: any) => {
      if (b.asset?._id && map.has(b.asset._id)) {
        map.get(b.asset._id).push(b);
      }
    });
    return map;
  }, [bookings, assets]);

  // Helper to calculate position and width in the timeline (09:00 to 18:00)
  const getTimelineStyle = (startTime: string, endTime: string) => {
    const parseTime = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h + m / 60;
    };
    
    const startHour = 9; // 9 AM
    const totalHours = 9; // 9 AM to 6 PM (18:00)
    
    const s = parseTime(startTime);
    const e = parseTime(endTime);
    
    // Constrain to timeline bounds
    const boundedStart = Math.max(startHour, s);
    const boundedEnd = Math.min(startHour + totalHours, e);
    
    if (boundedStart >= boundedEnd) return { display: 'none' };
    
    const leftPercent = ((boundedStart - startHour) / totalHours) * 100;
    const widthPercent = ((boundedEnd - boundedStart) / totalHours) * 100;
    
    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };

  const handleStatusChange = async (id: string, status: string) => {
    await fetch("/api/bookings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: id, status })
    });
    fetchData();
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Resource Booking</h1>
          <p className="text-[var(--text-secondary)]">Schedule shared rooms and equipment.</p>
        </div>
        <button onClick={() => { setConflictMessage(""); setIsModalOpen(true); }} className="btn btn-primary whitespace-nowrap">
          <Plus size={16} className="mr-2" /> New Booking
        </button>
      </div>

      {/* Date Navigator */}
      <div className="flex items-center justify-between glass-elevated p-4 rounded-xl mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="p-2 rounded-lg hover:bg-[var(--card)] text-white">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold text-white w-48 text-center">
            {format(currentDate, 'EEEE, MMM d, yyyy')}
          </h2>
          <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-2 rounded-lg hover:bg-[var(--card)] text-white">
            <ChevronRight size={20} />
          </button>
        </div>
        
        <div className="flex gap-2">
          {daysInWeek.map((day, i) => (
            <button
              key={i}
              onClick={() => setCurrentDate(day)}
              className={`flex flex-col items-center justify-center w-12 h-14 rounded-lg text-xs transition-colors ${
                isSameDay(day, currentDate) 
                  ? "bg-indigo-500 text-white shadow-lg" 
                  : "bg-[var(--card)] text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              <span className="font-medium mb-1">{format(day, 'EEE')}</span>
              <span className={isSameDay(day, currentDate) ? "text-white font-bold text-sm" : "text-white"}>
                {format(day, 'd')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline View */}
      <div className="glass-elevated rounded-xl overflow-hidden border border-[var(--border)]">
        {/* Timeline Header */}
        <div className="flex border-b border-[var(--border)] bg-[var(--card)]">
          <div className="w-64 shrink-0 p-4 font-semibold text-white border-r border-[var(--border)] flex items-center">
            Resource
          </div>
          <div className="flex-1 relative h-12 flex">
            {/* Hours 9 AM to 6 PM */}
            {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((hour) => (
              <div key={hour} className="flex-1 border-l border-[var(--border)] relative first:border-l-0">
                <span className="absolute -top-1 -translate-x-1/2 text-[10px] text-[var(--text-secondary)] mt-3">
                  {hour === 12 ? '12 PM' : hour > 12 ? `${hour-12} PM` : `${hour} AM`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Resources & Bookings */}
        <div className="divide-y divide-[var(--border)]">
          {assets.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-secondary)]">
              No bookable resources found. Mark assets as "Shared Resource" to see them here.
            </div>
          ) : (
            assets.map((asset: any) => (
              <div key={asset._id} className="flex group hover:bg-[var(--elevated)] transition-colors">
                
                {/* Resource Info */}
                <div className="w-64 shrink-0 p-4 border-r border-[var(--border)] flex flex-col justify-center">
                  <span className="font-medium text-white truncate" title={asset.name}>{asset.name}</span>
                  <span className="text-xs text-indigo-400 font-mono mt-0.5">{asset.assetTag}</span>
                  <span className="text-xs text-[var(--text-secondary)] mt-1">{asset.category?.name || "Shared"}</span>
                </div>

                {/* Timeline Tracks */}
                <div className="flex-1 relative min-h-[5rem] bg-[url('/grid-bg.svg')] bg-[length:11.11%_100%]">
                  {/* Grid lines (11.11% is 1/9th of the width for 9 hours) */}
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-l border-[var(--border)] pointer-events-none" style={{ left: `${(i/9)*100}%` }}></div>
                  ))}

                  {/* Booking Blocks */}
                  {(bookingsByAsset.get(asset._id) || []).map((booking: any) => {
                    const style = getTimelineStyle(booking.startTime, booking.endTime);
                    const isUpcoming = booking.status === "Upcoming";
                    const isOngoing = booking.status === "Ongoing";
                    
                    let bgClass = "bg-neutral-500/20 border-neutral-500/40 text-neutral-300";
                    if (isUpcoming) bgClass = "bg-blue-500/20 border-blue-500/40 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.2)]";
                    if (isOngoing) bgClass = "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]";

                    return (
                      <div 
                        key={booking._id} 
                        className={`absolute top-2 bottom-2 rounded-lg border flex flex-col p-2 overflow-hidden group/block cursor-pointer transition-all hover:z-10 hover:scale-[1.02] ${bgClass}`}
                        style={style}
                      >
                        <div className="font-semibold text-xs truncate">{booking.bookedBy?.name}</div>
                        <div className="text-[10px] opacity-80 truncate flex items-center gap-1 mt-0.5">
                          <Clock size={10} /> {booking.startTime} - {booking.endTime}
                        </div>
                        <div className="text-[10px] opacity-80 truncate mt-1">{booking.purpose}</div>
                        
                        {/* Hover Actions */}
                        <div className="absolute right-1 top-1 flex gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity bg-black/50 p-1 rounded backdrop-blur-md">
                          {booking.status === "Upcoming" && (
                            <>
                              <button onClick={() => handleStatusChange(booking._id, "Ongoing")} className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1 rounded hover:bg-emerald-500/40">Start</button>
                              <button onClick={() => handleStatusChange(booking._id, "Cancelled")} className="text-[10px] bg-red-500/20 text-red-400 px-1 rounded hover:bg-red-500/40">Cancel</button>
                            </>
                          )}
                          {booking.status === "Ongoing" && (
                            <button onClick={() => handleStatusChange(booking._id, "Completed")} className="text-[10px] bg-blue-500/20 text-blue-400 px-1 rounded hover:bg-blue-500/40">End</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            ))
          )}
        </div>
      </div>

      <BookingModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        assets={assets}
        selectedDate={currentDate}
        onSave={fetchData}
        conflictMessage={conflictMessage}
        setConflictMessage={setConflictMessage}
      />
    </DashboardLayout>
  );
}

function BookingModal({ isOpen, onClose, assets, selectedDate, onSave, conflictMessage, setConflictMessage }: any) {
  const [assetId, setAssetId] = useState("");
  const [date, setDate] = useState(format(selectedDate, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [purpose, setPurpose] = useState("");

  useEffect(() => {
    setDate(format(selectedDate, 'yyyy-MM-dd'));
  }, [selectedDate]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setConflictMessage("");
    
    if (startTime >= endTime) {
      setConflictMessage("End time must be after start time.");
      return;
    }

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        asset: assetId,
        date,
        startTime,
        endTime,
        purpose
      })
    });
    
    const data = await res.json();
    
    if (res.status === 409 && data.conflict) {
      setConflictMessage(data.error);
    } else if (res.ok) {
      onSave();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Booking">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        {conflictMessage && (
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle size={16} />
            {conflictMessage}
          </div>
        )}

        <div>
          <label className="block text-sm mb-1 text-[var(--text-secondary)]">Resource</label>
          <select value={assetId} onChange={e => { setAssetId(e.target.value); setConflictMessage(""); }} required className="input-field">
            <option value="">Select a resource...</option>
            {assets.map((a: any) => (
              <option key={a._id} value={a._id}>{a.name} ({a.assetTag})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1 text-[var(--text-secondary)]">Date</label>
          <input type="date" value={date} onChange={e => { setDate(e.target.value); setConflictMessage(""); }} required className="input-field" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1 text-[var(--text-secondary)]">Start Time</label>
            <input type="time" value={startTime} onChange={e => { setStartTime(e.target.value); setConflictMessage(""); }} required className="input-field" />
          </div>
          <div>
            <label className="block text-sm mb-1 text-[var(--text-secondary)]">End Time</label>
            <input type="time" value={endTime} onChange={e => { setEndTime(e.target.value); setConflictMessage(""); }} required className="input-field" />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1 text-[var(--text-secondary)]">Purpose / Meeting Name</label>
          <input type="text" value={purpose} onChange={e => setPurpose(e.target.value)} required className="input-field" placeholder="e.g., Q3 Planning" />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button type="button" onClick={onClose} className="btn bg-[var(--card)] border border-[var(--border)]">Cancel</button>
          <button type="submit" className="btn btn-primary">Book Resource</button>
        </div>
      </form>
    </Modal>
  );
}
