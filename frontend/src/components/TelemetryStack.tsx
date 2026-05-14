import React, { useEffect, useState } from 'react';
import { useMaitriStream } from '../context/MaitriStreamContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Gauge } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Chart data point schema
interface DataPoint {
  time: number;
  leftKnee: number;
  rightKnee: number;
}

export const TelemetryStack: React.FC = () => {
  const { frame } = useMaitriStream();
  const [chartData, setChartData] = useState<DataPoint[]>([]);

  const result = frame?.result;
  const metrics = result?.metrics;

  // Rep Pop Animation Effect
  const [pop, setPop] = useState(false);
  useEffect(() => {
    if (result?.rep_just_completed) {
      setPop(true);
      const timer = setTimeout(() => setPop(false), 200);
      return () => clearTimeout(timer);
    }
  }, [result?.rep_just_completed]);

  // Maintain rolling 10-second window (assume ~30fps)
  useEffect(() => {
    if (frame && metrics) {
      setChartData(prev => {
        const now = Date.now();
        const newPoint = {
          time: now,
          leftKnee: metrics.left_knee_angle || 0,
          rightKnee: metrics.right_knee_angle || 0
        };
        // Keep last ~300 points for a 10s window at 30fps
        const windowed = [...prev, newPoint].slice(-300);
        return windowed;
      });
    }
  }, [frame]);

  const MetricGauge = ({ label, value, unit = "°" }: { label: string, value: number | undefined, unit?: string }) => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center">
      <span className="text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-1">{label}</span>
      <span className="text-2xl font-mono font-bold text-zinc-100">
        {value !== undefined ? value.toFixed(1) : '--'}<span className="text-zinc-500 text-lg ml-1">{unit}</span>
      </span>
    </div>
  );

  return (
    <div className="h-full flex flex-col p-4 pl-0 gap-4 text-zinc-50">
      
      {/* Top Section: Reps & Phase */}
      <div className="flex gap-4 h-40">
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-4 left-4 flex items-center gap-2 text-zinc-400">
            <Activity className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-semibold">Rep Count</span>
          </div>
          <div className={cn(
            "text-7xl font-black font-mono tracking-tighter transition-transform duration-200",
            pop ? "scale-110 text-emerald-400" : "scale-100 text-zinc-100"
          )}>
            {result?.rep_count ?? 0}
          </div>
        </div>

        <div className="w-48 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col">
          <span className="text-zinc-400 text-xs uppercase tracking-wider font-semibold mb-4">Phase</span>
          <div className="flex-1 flex flex-col justify-between relative">
            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-zinc-800"></div>
            {['standing', 'descending', 'ascending'].map((p) => {
              const isActive = metrics?.phase === p;
              return (
                <div key={p} className="flex items-center gap-3 relative z-10">
                  <div className={cn(
                    "w-4 h-4 rounded-full border-4 transition-colors duration-200",
                    isActive ? "border-emerald-500 bg-zinc-900" : "border-zinc-700 bg-zinc-900"
                  )}></div>
                  <span className={cn(
                    "text-sm font-medium capitalize transition-colors duration-200",
                    isActive ? "text-emerald-400" : "text-zinc-500"
                  )}>{p}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Middle Section: Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        <MetricGauge label="L Knee Angle" value={metrics?.left_knee_angle} />
        <MetricGauge label="R Knee Angle" value={metrics?.right_knee_angle} />
        <MetricGauge label="Torso Angle" value={metrics?.torso_angle} />
        <MetricGauge label="Hip:Knee Ratio" value={metrics?.hip_to_knee_ratio} unit="x" />
      </div>

      {/* Bottom Section: Trend Analytics */}
      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col min-h-[200px]">
         <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-zinc-400">
            <Gauge className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-semibold">Live Trajectory (10s)</span>
          </div>
          <div className="flex gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div> L Knee
            </div>
            <div className="flex items-center gap-1.5 text-blue-400">
              <div className="w-2 h-2 rounded-full bg-blue-400"></div> R Knee
            </div>
          </div>
        </div>
        <div className="flex-1 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="time" hide />
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '0.5rem', color: '#f4f4f5' }}
                itemStyle={{ color: '#f4f4f5' }}
                labelStyle={{ display: 'none' }}
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="leftKnee" 
                stroke="#34d399" 
                strokeWidth={2} 
                dot={false}
                isAnimationActive={false} 
              />
              <Line 
                type="monotone" 
                dataKey="rightKnee" 
                stroke="#60a5fa" 
                strokeWidth={2} 
                dot={false} 
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
