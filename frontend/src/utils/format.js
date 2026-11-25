import { format, parseISO } from 'date-fns';

/** "yyyy-MM-dd" -> Date at local midnight (date-only strings parse as local time in date-fns). */
const toDate = (key) => parseISO(key);

export const formatLongDate = (key) => format(toDate(key), 'EEEE, MMMM d, yyyy');
export const formatShortDate = (key) => format(toDate(key), 'MMM d, yyyy');
export const formatWeekOf = (weekId) => `Week of ${format(toDate(weekId), 'MMMM d, yyyy')}`;
export const formatMonthYear = (year, monthIndex) => format(new Date(year, monthIndex, 1), 'MMMM yyyy');
export const formatTime = (ms) => (ms ? format(new Date(ms), 'h:mm:ss a') : '');
export const formatPercent = (rate) => `${Math.round(rate * 100)}%`;
