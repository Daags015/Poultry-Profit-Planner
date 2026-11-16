import React, { useEffect, useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { AppShell } from '@/src/components/AppShell';
import { useAuth } from '@/src/context/AuthContext';
import { useData } from '@/src/context/DataContext';
import { exportDataToJson } from '@/src/lib/export';
import type { WeightUnit } from '@/src/types/domain';

export const SettingsPage: React.FC = () => {
  const { user, profile, updateProfile, updatePassword, isSupabaseReady } = useAuth();
  const {
    farms,
    plans,
    cycles,
    flockRecords,
    feedRecords,
    eggRecords,
    financialRecords,
    calendarActivities,
    scenarios,
    pendingCount,
    saveFarm,
    deleteFarm,
  } = useData();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [currency, setCurrency] = useState(profile?.default_currency || '₦');
  const [bagWeight, setBagWeight] = useState(profile?.default_bag_weight_kg || 25);
  const [crateSize, setCrateSize] = useState(profile?.default_crate_size || 30);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(profile?.weight_unit || 'kg');
  const [profileSaved, setProfileSaved] = useState<string | null>(null);

  const [farmName, setFarmName] = useState('');
  const [farmLocation, setFarmLocation] = useState('');
  const [farmType, setFarmType] = useState('Broiler & Layer');

  const [newPassword, setNewPassword] = useState('');
  const [pwNotice, setPwNotice] = useState<string | null>(null);
  const [storagePersisted, setStoragePersisted] = useState<boolean | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setPhone(profile.phone);
      setCurrency(profile.default_currency);
      setBagWeight(profile.default_bag_weight_kg);
      setCrateSize(profile.default_crate_size);
      setWeightUnit(profile.weight_unit);
    }
  }, [profile]);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setStoragePersisted).catch(() => {});
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      full_name: fullName.trim(),
      phone: phone.trim(),
      default_currency: currency.trim() || '₦',
      default_bag_weight_kg: Math.max(1, bagWeight),
      default_crate_size: Math.max(1, crateSize),
      weight_unit: weightUnit,
    });
    setProfileSaved('Preferences saved on device and queued for sync.');
  };

  const handleAddFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmName.trim()) return;
    await saveFarm({
      farm_name: farmName.trim(),
      location: farmLocation.trim(),
      farm_type: farmType,
    });
    setFarmName('');
    setFarmLocation('');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwNotice(null);
    const { error } = await updatePassword(newPassword);
    if (error) setPwNotice(`Error: ${error}`);
    else {
      setPwNotice('Password updated successfully.');
      setNewPassword('');
    }
  };

  const handleJsonBackup = () => {
    exportDataToJson(`poultry-profit-backup-${new Date().toISOString().slice(0, 10)}`, {
      exportedAt: new Date().toISOString(),
      profile,
      farms,
      plans,
      cycles,
      flockRecords,
      feedRecords,
      eggRecords,
      financialRecords,
      calendarActivities,
      scenarios,
    });
  };

  return (
    <AppShell
      title="Farms & Account Settings"
      subtitle="Manage farm locations, currency & unit defaults, security, and offline storage backups"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Profile & Units */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-6 bg-white rounded-xl border border-[#26312D]/12 p-5 sm:p-6 space-y-4"
        >
          <h2 className="text-base font-bold text-[#173F35] font-display">
            Profile &amp; Unit Preferences
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#26312D] mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#26312D] mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#26312D] mb-1">Currency</label>
              <input
                type="text"
                maxLength={5}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#26312D] mb-1">Bag Wt (kg)</label>
              <input
                type="number"
                min={1}
                value={bagWeight}
                onChange={(e) => setBagWeight(Number(e.target.value))}
                className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#26312D] mb-1">Crate Size</label>
              <input
                type="number"
                min={1}
                value={crateSize}
                onChange={(e) => setCrateSize(Number(e.target.value))}
                className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#26312D] mb-1">Weight Unit</label>
              <select
                value={weightUnit}
                onChange={(e) => setWeightUnit(e.target.value as WeightUnit)}
                className="w-full min-h-[44px] px-2.5 rounded-lg border border-[#26312D]/20 bg-white text-sm"
              >
                <option value="kg">kg</option>
                <option value="lb">lb</option>
              </select>
            </div>
          </div>

          {profileSaved && <p className="text-xs font-semibold text-[#4F8A5B]">{profileSaved}</p>}

          <button
            type="submit"
            className="min-h-[44px] px-5 py-2 rounded-lg bg-[#173F35] text-white text-sm font-semibold hover:bg-[#173F35]/90"
          >
            Save Preferences
          </button>
        </form>

        {/* Farms Manager */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-[#26312D]/12 p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-bold text-[#173F35] font-display">
            Manage Farms ({farms.length})
          </h2>

          <form onSubmit={handleAddFarm} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <input
              type="text"
              required
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder="Farm Name (e.g. Pen A - Ogun)"
              className="sm:col-span-5 min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
            />
            <input
              type="text"
              value={farmLocation}
              onChange={(e) => setFarmLocation(e.target.value)}
              placeholder="Location"
              className="sm:col-span-4 min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
            />
            <button
              type="submit"
              className="sm:col-span-3 min-h-[44px] inline-flex items-center justify-center gap-1 rounded-lg bg-[#4F8A5B] text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Add Farm</span>
            </button>
          </form>

          {farms.length === 0 ? (
            <p className="text-xs text-[#26312D]/70 py-2">
              No farms added yet. Add a farm above to organize plans and cycles by site.
            </p>
          ) : (
            <div className="divide-y divide-[#26312D]/10">
              {farms.map((f) => (
                <div key={f.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#173F35]">{f.farm_name}</p>
                    <p className="text-xs text-[#26312D]/70">
                      {f.location || 'No location'} · {f.farm_type}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteFarm(f.id)}
                    className="p-2 text-red-700 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Backup & Offline Storage */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-[#26312D]/12 p-5 sm:p-6 space-y-4">
          <h2 className="text-base font-bold text-[#173F35] font-display">
            Offline Storage &amp; Manual Backup
          </h2>
          <dl className="divide-y divide-[#26312D]/10 text-xs sm:text-sm">
            <div className="py-2 flex justify-between">
              <dt className="text-[#26312D]/75">Persistent Device Storage</dt>
              <dd className="font-semibold">
                {storagePersisted === null ? 'Checking...' : storagePersisted ? 'Protected' : 'Standard'}
              </dd>
            </div>
            <div className="py-2 flex justify-between">
              <dt className="text-[#26312D]/75">Pending Outbox Sync Items</dt>
              <dd className="font-semibold tabular-nums">{pendingCount}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={handleJsonBackup}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#173F35]/25 text-sm font-semibold text-[#173F35] hover:bg-[#F7F6F0]"
          >
            <Download className="w-4 h-4" />
            <span>Download Full JSON Backup</span>
          </button>
        </div>

        {/* Password Change */}
        {user && isSupabaseReady && (
          <form
            onSubmit={handlePasswordChange}
            className="lg:col-span-6 bg-white rounded-xl border border-[#26312D]/12 p-5 sm:p-6 space-y-4"
          >
            <h2 className="text-base font-bold text-[#173F35] font-display">Change Password</h2>
            <input
              type="password"
              minLength={6}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 6 characters)"
              className="w-full min-h-[44px] px-3 rounded-lg border border-[#26312D]/20 text-sm"
            />
            {pwNotice && <p className="text-xs font-medium text-[#173F35]">{pwNotice}</p>}
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 rounded-lg bg-[#173F35] text-white text-sm font-semibold"
            >
              Update Password
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
};
