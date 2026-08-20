import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export default function RealtimeCalendar({ className = '', onSelectDate }) {
  // Real-time current date
  const today = new Date();

  // State for the currently viewed month/year and the selected date
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth(); // 0-11

  // Navigate to previous month
  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  // Navigate to next month
  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Reset to today
  const handleGoToToday = () => {
    const now = new Date();
    setViewDate(now);
    setSelectedDate(now);
    if (onSelectDate) onSelectDate(now);
  };

  // Select a day
  const handleSelectDay = (dayObj) => {
    const newSelected = new Date(dayObj.year, dayObj.month, dayObj.day);
    setSelectedDate(newSelected);
    // If selecting a day in prev/next month, shift the view accordingly
    if (dayObj.month !== currentMonth || dayObj.year !== currentYear) {
      setViewDate(new Date(dayObj.year, dayObj.month, 1));
    }
    if (onSelectDate) onSelectDate(newSelected);
  };

  // Helpers for checking equality
  const isSameDay = (d, m, y, targetDate) => {
    if (!targetDate) return false;
    return (
      targetDate.getDate() === d &&
      targetDate.getMonth() === m &&
      targetDate.getFullYear() === y
    );
  };

  // Month & Year string: e.g., "August 2026", "April 2025"
  const monthName = viewDate.toLocaleString('default', { month: 'long' });
  const displayMonthYear = `${monthName} ${currentYear}`;

  // Days of current month calculation
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Trailing days from previous month
  const prevMonthDays = [];
  const prevMonthIndex = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    prevMonthDays.push({
      day: daysInPrevMonth - i,
      month: prevMonthIndex,
      year: prevMonthYear,
      isCurrentMonth: false,
    });
  }

  // Days in current month
  const currentMonthDays = [];
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    currentMonthDays.push({
      day: i,
      month: currentMonth,
      year: currentYear,
      isCurrentMonth: true,
    });
  }

  // Leading days for next month to complete the grid (fixed 35 or 42 slots)
  const totalDaysSoFar = prevMonthDays.length + currentMonthDays.length;
  const totalSlotsNeeded = totalDaysSoFar <= 35 ? 35 : 42;
  const nextMonthSlots = totalSlotsNeeded - totalDaysSoFar;

  const nextMonthIndex = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;

  const nextMonthDays = [];
  for (let i = 1; i <= nextMonthSlots; i++) {
    nextMonthDays.push({
      day: i,
      month: nextMonthIndex,
      year: nextMonthYear,
      isCurrentMonth: false,
    });
  }

  const allDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];

  return (
    <div className={`bg-white/80 backdrop-blur-xl border border-white/60 shadow-premium p-6 rounded-2xl ${className}`}>
      {/* Header: Prev / Month Year / Next */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={handlePrevMonth}
          aria-label="Previous Month"
          className="p-2 rounded-full hover:bg-slate-100 text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={handleGoToToday}
          title="Click to jump to Today"
          className="bg-red-600 hover:bg-red-700 active:scale-95 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-md shadow-red-500/20 transition-all cursor-pointer select-none"
        >
          {displayMonthYear}
        </button>

        <button
          type="button"
          onClick={handleNextMonth}
          aria-label="Next Month"
          className="p-2 rounded-full hover:bg-slate-100 text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Days of Week Header: S M T W T F S */}
      <div className="grid grid-cols-7 gap-1 text-center text-sm mb-2 font-semibold text-slate-600">
        <div>S</div>
        <div>M</div>
        <div>T</div>
        <div>W</div>
        <div>T</div>
        <div>F</div>
        <div>S</div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {allDays.map((item, idx) => {
          const isSelected = isSameDay(item.day, item.month, item.year, selectedDate);
          const isCurrentToday = isSameDay(item.day, item.month, item.year, today);

          let buttonClasses = "w-8 h-8 flex items-center justify-center mx-auto rounded-full text-xs sm:text-sm font-medium transition-all duration-150 select-none cursor-pointer ";

          if (isSelected) {
            buttonClasses += "bg-red-600 text-white font-bold shadow-md shadow-red-500/30 scale-105";
          } else if (isCurrentToday) {
            buttonClasses += "text-red-600 font-bold border-2 border-red-500/80 bg-red-50/50 hover:bg-red-100";
          } else if (item.isCurrentMonth) {
            buttonClasses += "text-slate-700 hover:bg-slate-100 hover:text-slate-900";
          } else {
            buttonClasses += "text-slate-300 hover:bg-slate-50 hover:text-slate-400";
          }

          return (
            <div key={`${item.year}-${item.month}-${item.day}-${idx}`} className="flex justify-center items-center py-0.5">
              <button
                type="button"
                onClick={() => handleSelectDay(item)}
                className={buttonClasses}
                title={`${new Date(item.year, item.month, item.day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}${isCurrentToday ? ' (Today)' : ''}`}
              >
                {item.day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
