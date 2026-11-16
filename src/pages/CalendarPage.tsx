import React, { useMemo, useState } from 'react';
import { CheckSquare, Plus, Square, Trash2 } from 'lucide-react';
import { AppShell } from '@/src/components/AppShell';
import { useData } from '@/src/context/DataContext';
import type { CalendarActivityType } from '@/src/types/domain';

const ACTIVITY_TYPES: CalendarActivityType[] = [
  'vaccination',
  'medication',
  'feed_change',
  'weighing',
  'egg_milestone',
  'market_date',
  'general',
];

export const CalendarPage: React.FC = () => {
  const {
    farms,
    cycles,
    calendarActivities,
    selectedFarmId,
    setSelectedFarmId,
    saveCalendarActivity,
    toggleCalendarActivity,
    deleteCalendarActivity,
  } = useData();

  const [cycleFilter, setCycleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'outstanding' | 'completed'>('all');

  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [newType, setNewType] = useState<CalendarActivityType>('vaccination');
  const [newCycleId, setNewCycleId] = useState<string>('');
  const [newNotes, setNewNotes] = useState('');

  const visibleCycles = useMemo(
    () =>
      selectedFarmId === 'all'
        ? cycles
        : cycles.filter((c) => c.farm_id === selectedFarmId),
    [cycles, selectedFarmId]
  );

  const visibleCycleIds = useMemo(() => new Set(visibleCycles.map((c) => c.id)), [visibleCycles]);

  const filteredActivities = useMemo(() => {
    return calendarActivities.filter((a) => {
      if (selectedFarmId !== 'all' && a.cycle_id && !visibleCycleIds.has(a.cycle_id)) {
        return false;
      }
      if (cycleFilter !== 'all' && a.cycle_id !== cycleFilter) return false;
      if (statusFilter === 'outstanding' && a.is_completed) return false;
      if (statusFilter === 'completed' && !a.is_completed) return false;
      return true;
    });
  }, [calendarActivities, selectedFarmId, visibleCycleIds, cycleFilter, statusFilter]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await saveCalendarActivity({
      title: newTitle.trim(),
      scheduled_date: newDate,
      activity_type: newType,
      cycle_id: newCycleId || null,
      notes: newNotes.trim(),
    });
    setNewTitle('');
    setNewNotes('');
  };

  return (
    <AppShell
      title="Production Calendar"
      subtitle="Auto-scheduled flock milestones and custom poultry house tasks"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Add Task Form */}
        <form
          onSubmit={handleAdd}
          className="lg:col-span-4 bg-white rounded-xl border border-[#26312D]/12 p-5 space-y-4"
        >
          <h2 className="text-base font-bold text-[#173F35] font-display">Add Farm Activity</h2>

          <div>
            <label className="block text-xs font-medium text-[#26312D] mb-1">Task Title</label>
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Lasota eye-drop vaccination"
              className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#26312D] mb-1">Date</label>
              <input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#26312D] mb-1">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as CalendarActivityType)}
                className="w-full min-h-[44px] px-2.5 rounded-lg border border-[#26312D]/20 bg-white text-sm"
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#26312D] mb-1">
              Production Cycle (optional)
            </label>
            <select
              value={newCycleId}
              onChange={(e) => setNewCycleId(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 bg-white text-sm"
            >
              <option value="">General Farm Task</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.cycle_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#26312D] mb-1">Notes</label>
            <textarea
              rows={2}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full p-3 rounded-lg border border-[#26312D]/20 text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#173F35] text-white text-sm font-semibold hover:bg-[#173F35]/90"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Activity</span>
          </button>
        </form>

        {/* Task List */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-[#26312D]/12 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#26312D]/10">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
                className="min-h-[40px] px-3 rounded-lg border border-[#26312D]/20 bg-[#F7F6F0] text-xs font-medium"
              >
                <option value="all">All Farms</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.farm_name}
                  </option>
                ))}
              </select>

              <select
                value={cycleFilter}
                onChange={(e) => setCycleFilter(e.target.value)}
                className="min-h-[40px] px-3 rounded-lg border border-[#26312D]/20 bg-[#F7F6F0] text-xs font-medium"
              >
                <option value="all">All Cycles</option>
                {visibleCycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.cycle_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="inline-flex p-1 rounded-lg bg-[#F7F6F0]">
              {(['all', 'outstanding', 'completed'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`min-h-[34px] px-3 rounded-md text-xs font-semibold capitalize ${
                    statusFilter === st ? 'bg-white text-[#173F35] shadow-xs' : 'text-[#26312D]/70'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {filteredActivities.length === 0 ? (
            <p className="text-sm text-[#26312D]/70 py-8 text-center">
              No scheduled activities match this filter. Convert a plan to an active cycle or schedule a task on the left.
            </p>
          ) : (
            <div className="divide-y divide-[#26312D]/10">
              {filteredActivities.map((act) => (
                <div
                  key={act.id}
                  className="py-3.5 flex items-start justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => void toggleCalendarActivity(act.id)}
                    className="flex items-start gap-3 text-left flex-1 min-h-[44px]"
                  >
                    {act.is_completed ? (
                      <CheckSquare className="w-5 h-5 text-[#4F8A5B] mt-0.5 shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-[#173F35] mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          act.is_completed ? 'line-through text-[#26312D]/50' : 'text-[#173F35]'
                        }`}
                      >
                        {act.title}
                      </p>
                      <p className="text-xs text-[#26312D]/70 tabular-nums mt-0.5">
                        {act.scheduled_date} · <span className="capitalize">{act.activity_type.replace('_', ' ')}</span>
                        {act.notes ? ` · ${act.notes}` : ''}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteCalendarActivity(act.id)}
                    aria-label="Delete task"
                    className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-red-700 hover:bg-red-50 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};
