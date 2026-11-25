import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import CalendarView from '../features/assignments/CalendarView';
import { useAppStore } from '../store/useAppStore';
import { useWeekContext } from '../hooks/useWeekContext';
import { formatWeekOf } from '../utils/format';

export default function CalendarPage() {
  const navigate = useNavigate();
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const { dateKey, today, weekId, settings } = useWeekContext();

  return (
    <>
      <TopBar title="Calendar" />
      <main className="flex flex-col gap-4 p-4">
        <CalendarView
          selected={dateKey}
          today={today}
          weekStartsOn={settings.weekStartsOn}
          onSelect={(key) => {
            setSelectedDate(key === today ? null : key);
            navigate('/');
          }}
        />
        <p className="text-center text-sm text-white/70">{formatWeekOf(weekId)} is currently selected. Tap a date to load its week.</p>
      </main>
    </>
  );
}
