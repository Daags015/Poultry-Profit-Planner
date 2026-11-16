import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useData } from '@/src/context/DataContext';
import type { ProductionPlan } from '@/src/types/domain';

interface ConvertCycleModalProps {
  plan: ProductionPlan;
  onClose: () => void;
  onConverted: (cycleId: string) => void;
}

export const ConvertCycleModal: React.FC<ConvertCycleModalProps> = ({
  plan,
  onClose,
  onConverted,
}) => {
  const { farms, convertPlanToCycle } = useData();
  const [cycleName, setCycleName] = useState(`${plan.plan_name} — Batch`);
  const [farmId, setFarmId] = useState<string>(plan.farm_id || farms[0]?.id || '');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [trackingMode, setTrackingMode] = useState<'bag_inventory' | 'simple_expense'>(
    'bag_inventory'
  );
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cycle = await convertPlanToCycle({
        plan,
        cycleName: cycleName.trim() || plan.plan_name,
        farmId: farmId || null,
        startDate,
        trackingMode,
      });
      onConverted(cycle.id);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#26312D]/15 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#26312D]/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#173F35] font-display">
            Convert Plan to Active Cycle
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg hover:bg-[#F7F6F0]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-6 space-y-4">
          <p className="text-xs text-[#26312D]/75">
            Automatically copies your bird count, chick unit cost, feed stages, and budget targets into a live cycle and schedules recommended vaccination and feed-switch milestones.
          </p>

          <div>
            <label className="block text-xs font-medium text-[#26312D] mb-1.5">
              Active Cycle Name
            </label>
            <input
              type="text"
              required
              value={cycleName}
              onChange={(e) => setCycleName(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#26312D]/20 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#26312D] mb-1.5">
                Assign to Farm
              </label>
              <select
                value={farmId}
                onChange={(e) => setFarmId(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 bg-white text-sm"
              >
                <option value="">Unassigned / Default</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.farm_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#26312D] mb-1.5">
                Stocking Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-lg border border-[#26312D]/20 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#26312D] mb-1.5">
              Feed Tracking Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTrackingMode('bag_inventory')}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  trackingMode === 'bag_inventory'
                    ? 'border-[#173F35] bg-[#173F35]/5'
                    : 'border-[#26312D]/15 bg-white'
                }`}
              >
                <p className="text-sm font-bold text-[#173F35]">Bag Inventory Mode</p>
                <p className="text-xs text-[#26312D]/70 mt-0.5">
                  Tracks feed bags purchased minus daily bags consumed for live store balance.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setTrackingMode('simple_expense')}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  trackingMode === 'simple_expense'
                    ? 'border-[#173F35] bg-[#173F35]/5'
                    : 'border-[#26312D]/15 bg-white'
                }`}
              >
                <p className="text-sm font-bold text-[#173F35]">Simple Expense Mode</p>
                <p className="text-xs text-[#26312D]/70 mt-0.5">
                  Records feed purchases directly as cycle expenses without daily bag deductions.
                </p>
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-lg border border-[#26312D]/20 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] px-5 py-2 rounded-lg bg-[#173F35] text-white text-sm font-semibold hover:bg-[#173F35]/90"
            >
              {submitting ? 'Creating Cycle...' : 'Start Active Cycle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
