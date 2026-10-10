import { useEffect, useState } from 'react';
import { autoBackupIfDue } from './data/backup';
import { requestPersistentStorage } from './data/db';
import { START_DATE } from './domain/habits';
import { BibleView } from './ui/BibleView';
import { CalendarView } from './ui/CalendarView';
import { DayView } from './ui/DayView';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { useHabits, useToday } from './ui/hooks';
import { IconGear, Logo, TabBible, TabCalendar, TabDay, TabProgress } from './ui/icons';
import { ProgressView } from './ui/ProgressView';
import { SettingsView } from './ui/SettingsView';

type Tab = 'day' | 'calendar' | 'bible' | 'progress' | 'settings';

const TABS: { id: Tab; label: string; icon: () => JSX.Element }[] = [
  { id: 'day', label: 'Dia', icon: TabDay },
  { id: 'calendar', label: 'Calendário', icon: TabCalendar },
  { id: 'bible', label: 'Bíblia', icon: TabBible },
  { id: 'progress', label: 'Progresso', icon: TabProgress }
];

export function App() {
  const today = useToday();
  const habits = useHabits();
  const [tab, setTab] = useState<Tab>('day');
  const [date, setDate] = useState(today < START_DATE ? START_DATE : today);

  useEffect(() => {
    requestPersistentStorage();
    autoBackupIfDue();
    const onVisible = () => {
      if (document.visibilityState === 'visible') autoBackupIfDue();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const go = (t: Tab) => {
    setTab(t);
    window.scrollTo(0, 0);
  };

  return (
    <>
      <header className="hdr">
        <div className="hdr-in">
          <div className="brand"><Logo /><span>Degrau<small>um passo por dia</small></span></div>
          <button type="button" className="gear" aria-label="Configurações e backup" aria-pressed={tab === 'settings'} onClick={() => go(tab === 'settings' ? 'day' : 'settings')}><IconGear /></button>
        </div>
      </header>
      <main className="wrap">
        <ErrorBoundary key={tab}>
        {!habits ? (
          <div className="card"><p className="muted">Carregando seus dados...</p></div>
        ) : tab === 'day' ? (
          <DayView habits={habits} today={today} date={date} onDate={setDate} />
        ) : tab === 'calendar' ? (
          <CalendarView habits={habits} today={today} date={date} onPick={(d) => { setDate(d); go('day'); }} />
        ) : tab === 'bible' ? (
          <BibleView habits={habits} today={today} />
        ) : tab === 'progress' ? (
          <ProgressView habits={habits} today={today} />
        ) : (
          <SettingsView />
        )}
        </ErrorBoundary>
      </main>
      <nav className="tabs" aria-label="Seções">
        <div className="tabs-in">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className="tab" aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>
              <Icon />{label}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
