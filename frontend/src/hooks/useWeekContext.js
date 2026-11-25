import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { todayKey, weekIdFor, previousWeekId } from '../utils/weeks';

/** Resolves the selected date / week from the store and the configured timezone + week start. */
export function useWeekContext() {
  const settings = useAppStore((s) => s.settings);
  const selectedDate = useAppStore((s) => s.selectedDate);
  return useMemo(() => {
    const today = todayKey(settings.timezone);
    const dateKey = selectedDate || today;
    const weekId = weekIdFor(dateKey, settings.weekStartsOn);
    return { today, dateKey, weekId, previousWeekId: previousWeekId(weekId), settings };
  }, [selectedDate, settings]);
}
