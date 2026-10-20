import assert from 'node:assert/strict';
import { formatHoursMinutes, elapsedSince, daysSince, sleepByCalendarDay, sleepEntriesForDay, entriesToday } from '../src/utils/overviewInsights.js';
process.env.TZ = 'Europe/Amsterdam';
const now = new Date('2026-10-20T12:30:00+02:00');
assert.equal(formatHoursMinutes(3.5), '3h 30m');
assert.equal(formatHoursMinutes(0.1), '0h 6m');
assert.equal(formatHoursMinutes(1.999), '2h 0m');
assert.equal(formatHoursMinutes(null), '—');
assert.equal(elapsedSince([{start:'2026-10-19T23:30:00+02:00'}], 'start', now), 13);
assert.equal(elapsedSince([{end:'2026-10-20T10:15:00+02:00'}, {end:null}], 'end', now), 2.25);
assert.equal(elapsedSince([], 'end', now), null);
assert.equal(daysSince([{time:'2026-10-17T11:30:00+02:00'}], now), 3);
assert.equal(daysSince([], now), null);
assert.equal(entriesToday([{start:'2026-10-19T23:59:00+02:00'}], 'start', now).length, 0);
const sleeps = [
 {id:1,start:'2026-10-19T22:00:00+02:00',end:'2026-10-20T06:00:00+02:00'},
 {id:2,start:'2026-10-20T09:00:00+02:00',end:'2026-10-20T10:30:00+02:00'},
];
const days = sleepByCalendarDay(sleeps, now);
assert.equal(days.at(-2).hours, 2);
assert.equal(days.at(-1).hours, 7.5);
assert.equal(days.at(-1).sleep0, 6);
assert.equal(days.at(-1).sleep1, 1.5);
assert.equal(days.reduce((n,d)=>n+d.hours,0), 9.5);
const clipped = sleepEntriesForDay(sleeps, 'Tue', now);
assert.equal(clipped[0].displayHours, 6);
assert.equal(clipped[0].start, sleeps[0].start, 'edits retain original start');
assert.equal(new Date(clipped[0].displayStart).getHours(), 0);
assert.equal(sleepByCalendarDay([{start:'2026-10-20T11:30:00+02:00',end:null}], now).at(-1).hours, 1);
assert.equal(sleepByCalendarDay([{start:'2026-10-20T11:30:00+02:00',end:'invalid'}], now).at(-1).hours, 0);
// A sleep entering the first displayed day must not disappear at the week boundary.
assert.equal(sleepByCalendarDay([{start:'2026-10-13T22:00:00+02:00',end:'2026-10-14T06:00:00+02:00'}],now)[0].hours, 6);
const dstNow = new Date('2026-10-25T12:00:00+01:00');
assert.equal(sleepByCalendarDay([{start:'2026-10-24T23:00:00+02:00',end:'2026-10-25T04:00:00+01:00'}], dstNow).at(-1).hours, 5, 'DST uses actual elapsed time between local midnights');
console.log('overview summary and calendar sleep checks passed');
