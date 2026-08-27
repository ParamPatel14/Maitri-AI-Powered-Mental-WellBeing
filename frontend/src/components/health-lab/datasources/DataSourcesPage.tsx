import React, { useState } from 'react';
import { Database, Watch, Camera, MessageCircle, Brain, ToggleLeft, ToggleRight } from 'lucide-react';
import { useHealthLab } from '../../../context/HealthLabContext';
import { SectionHeader } from '../shared/GlassCard';
import { today } from '../../../lib/date-utils';
import { createManualWearableEntry } from '../../../lib/data-collection';
import type { DataSourceConfig } from '../../../types/health-lab';

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  wearable: <Watch className="w-5 h-5" />,
  camera: <Camera className="w-5 h-5" />,
  manual: <Database className="w-5 h-5" />,
  cognitive: <Brain className="w-5 h-5" />,
  conversation: <MessageCircle className="w-5 h-5" />,
};

const DEFAULT_SOURCES: Omit<DataSourceConfig, 'enabled'>[] = [
  { id: 'wearable', type: 'wearable', name: 'Smartwatch / Wearable', lastSyncAt: null, syncFrequency: 'daily', permissions: ['heart_rate', 'steps', 'sleep'] },
  { id: 'camera', type: 'camera', name: 'Camera (Posture)', lastSyncAt: null, syncFrequency: 'realtime', permissions: ['pose_detection'] },
  { id: 'manual', type: 'manual', name: 'Manual Entry', lastSyncAt: null, syncFrequency: 'manual', permissions: ['all'] },
  { id: 'cognitive', type: 'cognitive', name: 'Cognitive Tests', lastSyncAt: null, syncFrequency: 'manual', permissions: ['test_results'] },
  { id: 'conversation', type: 'conversation', name: 'AI Conversations', lastSyncAt: null, syncFrequency: 'realtime', permissions: ['text'] },
];

export const DataSourcesPage: React.FC = () => {
  const { dataSources, saveDataSource, wearables, saveWearableData } = useHealthLab();
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualData, setManualData] = useState({
    heartRateResting: '',
    steps: '',
    sleepHours: '',
    hrv: '',
    caloriesBurned: '',
  });

  const sources = DEFAULT_SOURCES.map(s => {
    const saved = dataSources.find(d => d.id === s.id);
    return { ...s, enabled: saved?.enabled ?? (s.id === 'manual' || s.id === 'cognitive' || s.id === 'conversation') };
  });

  const toggleSource = (id: string) => {
    const existing = dataSources.find(d => d.id === id);
    const source: DataSourceConfig = {
      id,
      type: DEFAULT_SOURCES.find(s => s.id === id)?.type || 'manual',
      name: DEFAULT_SOURCES.find(s => s.id === id)?.name || id,
      enabled: !existing?.enabled,
      lastSyncAt: existing?.lastSyncAt ?? null,
      syncFrequency: existing?.syncFrequency ?? 'manual',
      permissions: existing?.permissions ?? [],
    };
    saveDataSource(source);
  };

  const handleManualSubmit = () => {
    const data = createManualWearableEntry({
      date: today(),
      heartRateResting: manualData.heartRateResting ? parseInt(manualData.heartRateResting) : undefined,
      steps: manualData.steps ? parseInt(manualData.steps) : undefined,
      sleepHours: manualData.sleepHours ? parseFloat(manualData.sleepHours) : undefined,
      hrv: manualData.hrv ? parseInt(manualData.hrv) : undefined,
      caloriesBurned: manualData.caloriesBurned ? parseInt(manualData.caloriesBurned) : undefined,
    });
    saveWearableData(data);
    setShowManualEntry(false);
    setManualData({ heartRateResting: '', steps: '', sleepHours: '', hrv: '', caloriesBurned: '' });
  };

  const recentWearables = wearables.slice(-7);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <SectionHeader
        title="Data Sources"
        subtitle="Manage how Maitri collects your information"
      />

      {/* Source list */}
      <div className="space-y-3 mb-8">
        {sources.map(source => (
          <div key={source.id} className="flex items-center gap-4 p-4 bg-white border border-zinc-200 rounded-2xl shadow-sm">
            <div className="p-2 rounded-xl bg-violet-100 text-violet-600">
              {SOURCE_ICONS[source.type]}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">{source.name}</div>
              <div className="text-xs text-zinc-500">
                {source.type === 'wearable' && 'Heart rate, steps, sleep, HRV'}
                {source.type === 'camera' && 'Posture analysis during sessions'}
                {source.type === 'manual' && 'Enter data yourself'}
                {source.type === 'cognitive' && 'Reaction time, memory tests'}
                {source.type === 'conversation' && 'Daily check-in conversations'}
              </div>
            </div>
            <button onClick={() => toggleSource(source.id)} className="text-violet-600">
              {source.enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8 text-zinc-300" />}
            </button>
          </div>
        ))}
      </div>

      {/* Manual wearable entry */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Quick Wearable Entry</h3>
          <button
            onClick={() => setShowManualEntry(!showManualEntry)}
            className="text-xs text-violet-600 hover:text-violet-700 font-semibold"
          >
            {showManualEntry ? 'Cancel' : 'Enter Data'}
          </button>
        </div>

        {showManualEntry && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Resting Heart Rate (bpm)</label>
                <input
                  type="number"
                  value={manualData.heartRateResting}
                  onChange={e => setManualData({ ...manualData, heartRateResting: e.target.value })}
                  placeholder="e.g. 62"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Steps</label>
                <input
                  type="number"
                  value={manualData.steps}
                  onChange={e => setManualData({ ...manualData, steps: e.target.value })}
                  placeholder="e.g. 7500"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Sleep (hours)</label>
                <input
                  type="number"
                  step="0.5"
                  value={manualData.sleepHours}
                  onChange={e => setManualData({ ...manualData, sleepHours: e.target.value })}
                  placeholder="e.g. 7.5"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">HRV (ms)</label>
                <input
                  type="number"
                  value={manualData.hrv}
                  onChange={e => setManualData({ ...manualData, hrv: e.target.value })}
                  placeholder="e.g. 45"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500 transition-all"
                />
              </div>
            </div>
            <button
              onClick={handleManualSubmit}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all"
            >
              Save Today's Data
            </button>
          </div>
        )}

        {!showManualEntry && recentWearables.length > 0 && (
          <div className="text-xs text-zinc-500">
            Last entry: {recentWearables[recentWearables.length - 1].date} — Steps: {recentWearables[recentWearables.length - 1].steps ?? 'N/A'}, HR: {recentWearables[recentWearables.length - 1].heartRateResting ?? 'N/A'} bpm
          </div>
        )}

        {!showManualEntry && recentWearables.length === 0 && (
          <p className="text-xs text-zinc-400">No wearable data yet. Click "Enter Data" to add today's information.</p>
        )}
      </div>

      {/* How it works */}
      <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-500">
        <p className="font-semibold text-zinc-700 mb-1">How data collection works</p>
        <p>
          Maitri gradually builds your personal profile from multiple sources. The more sources you enable,
          the better we understand your patterns. All data stays on your device in localStorage.
          We never send your data anywhere except for AI analysis (which uses anonymous patterns).
        </p>
      </div>
    </div>
  );
};
