export function formatHoursMinutes(hours) {
  if (hours == null || !Number.isFinite(hours)) return '—';
  const minutes = Math.max(0, Math.round(hours * 60));
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function elapsedSince(entries, field, now = new Date()) {
  const times = entries.map(entry => entry[field] ? new Date(entry[field]).getTime() : NaN)
    .filter(time => Number.isFinite(time) && time <= now.getTime());
  return times.length ? (now.getTime() - Math.max(...times)) / 3600000 : null;
}

export function daysSince(entries, now = new Date()) {
  const hours = elapsedSince(entries, 'time', now);
  return hours == null ? null : Math.floor(hours / 24);
}

export function entriesToday(entries, field, now = new Date()) {
  return entries.filter(entry => new Date(entry[field]).toDateString() === now.toDateString());
}

function calendarDays(now) {
  return Array.from({length: 7}, (_, index) => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6 + index);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return {start, end, day: start.toLocaleDateString('en-US', {weekday: 'short'})};
  });
}

function overlap(entry, day, now) {
  const start = Math.max(new Date(entry.start).getTime(), day.start.getTime());
  const end = Math.min(entry.end ? new Date(entry.end).getTime() : now.getTime(), day.end.getTime(), now.getTime());
  return Number.isFinite(start) && Number.isFinite(end) && end > start
    ? {start, end, hours: (end - start) / 3600000} : null;
}

// Each sleep is its own stacked segment; allocate only its overlap with a local day.
export function sleepByCalendarDay(entries, now = new Date()) {
  const ordered = [...entries].sort((a, b) => new Date(a.start) - new Date(b.start));
  return calendarDays(now).map(day => {
    const row = {day: day.day, hours: 0};
    let index = 0;
    for (const entry of ordered) {
      const portion = overlap(entry, day, now);
      if (!portion) continue;
      row[`sleep${index++}`] = portion.hours;
      row.hours += portion.hours;
    }
    return row;
  });
}

export function sleepEntriesForDay(entries, label, now = new Date()) {
  const day = calendarDays(now).find(day => day.day === label);
  if (!day) return [];
  return entries.flatMap(entry => {
    const portion = overlap(entry, day, now);
    return portion ? [{...entry, displayStart: portion.start, displayEnd: portion.end, displayHours: portion.hours}] : [];
  });
}
