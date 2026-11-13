import React, { useMemo } from 'react';
import {
  Activity, Brain, CalendarCheck, Camera, CheckCircle2, Clock, Coffee,
  Dumbbell, FlaskConical, Gauge, MessageSquare, Sparkles, Watch,
} from 'lucide-react';
import { useHealthLab } from '../../../context/HealthLabContext';
import { SectionHeader, EmptyState } from '../shared/GlassCard';
import { formatDate, formatDisplayDate } from '../../../lib/date-utils';
import type { WellnessActivity, WellnessActivityType } from '../../../types/health-lab';

const ACTIVITY_STYLE: Record<WellnessActivityType, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
}> = {
  workout_session: { icon: <Dumbbell className="w-4 h-4" />, color: 'text-emerald-700', bgColor: 'bg-emerald-100', label: 'Workout' },
  readiness_assessment: { icon: <Gauge className="w-4 h-4" />, color: 'text-emerald-700', bgColor: 'bg-emerald-100', label: 'Readiness' },
  daily_checkin: { icon: <CalendarCheck className="w-4 h-4" />, color: 'text-violet-700', bgColor: 'bg-violet-100', label: 'Check-in' },
  habit_completion: { icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-blue-700', bgColor: 'bg-blue-100', label: 'Habit' },
  cognitive_test: { icon: <Brain className="w-4 h-4" />, color: 'text-fuchsia-700', bgColor: 'bg-fuchsia-100', label: 'Cognitive test' },
  wearable_entry: { icon: <Watch className="w-4 h-4" />, color: 'text-cyan-700', bgColor: 'bg-cyan-100', label: 'Wearable' },
  lifestyle_entry: { icon: <Coffee className="w-4 h-4" />, color: 'text-amber-700', bgColor: 'bg-amber-100', label: 'Lifestyle' },
  posture_snapshot: { icon: <Camera className="w-4 h-4" />, color: 'text-sky-700', bgColor: 'bg-sky-100', label: 'Posture' },
  conversation: { icon: <MessageSquare className="w-4 h-4" />, color: 'text-indigo-700', bgColor: 'bg-indigo-100', label: 'Conversation' },
  insight: { icon: <Sparkles className="w-4 h-4" />, color: 'text-violet-700', bgColor: 'bg-violet-100', label: 'Insight' },
  experiment: { icon: <FlaskConical className="w-4 h-4" />, color: 'text-amber-700', bgColor: 'bg-amber-100', label: 'Experiment' },
  timeline_event: { icon: <Activity className="w-4 h-4" />, color: 'text-zinc-600', bgColor: 'bg-zinc-100', label: 'Milestone' },
};

const SOURCE_LABEL: Record<WellnessActivity['source'], string> = {
  live_exercise_coaching: 'Live Coaching',
  health_lab: 'Health Lab',
  wearable: 'Wearable',
  manual: 'Manual entry',
};

export const TimelinePage: React.FC = () => {
  const { wellnessActivities, profile } = useHealthLab();
  const groupedActivities = useMemo(() => {
    const groups: Record<string, WellnessActivity[]> = {};
    wellnessActivities.forEach(activity => {
      const date = formatDate(new Date(activity.timestamp));
      (groups[date] ??= []).push(activity);
    });
    return groups;
  }, [wellnessActivities]);
  const dates = Object.keys(groupedActivities).sort((a, b) => b.localeCompare(a));

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <SectionHeader title="Wellness Timeline" subtitle="Your exercise, check-ins, habits, and assessments in one history" />

      {!profile ? (
        <EmptyState
          icon={<Clock className="w-8 h-8" />}
          title="No journey yet"
          description="Complete onboarding to start your wellness history."
        />
      ) : dates.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-violet-50 border border-violet-200 mb-4">
            <Clock className="w-5 h-5 text-violet-600" />
            <span className="text-sm font-medium text-violet-700">Your journey begins here</span>
          </div>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">Completed activities from Live Coaching and Health Lab will appear here in date order.</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-zinc-200" />
          <div className="space-y-8">
            {dates.map(date => (
              <section key={date}>
                <div className="flex items-center gap-3 mb-4 relative">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-zinc-200 flex items-center justify-center z-10">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">
                      {new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 font-medium">{formatDisplayDate(date)}</div>
                </div>

                <div className="space-y-3 ml-6 pl-8">
                  {groupedActivities[date].map(activity => {
                    const style = ACTIVITY_STYLE[activity.activityType];
                    const formIssues = Array.isArray(activity.data.detectedFormIssues)
                      ? activity.data.detectedFormIssues as Array<{ name: string; frameCount: number }>
                      : [];
                    const issueSummary = formIssues.map(issue => `${issue.name.replaceAll('_', ' ')} (${issue.frameCount})`).join(', ');
                    const time = activity.timePrecision === 'exact'
                      ? new Date(activity.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                      : 'Time not recorded';

                    return (
                      <article key={activity.id} className="relative">
                        <div className={`absolute -left-10 top-3 w-4 h-4 rounded-full ${style.bgColor} border-2 border-white flex items-center justify-center`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${style.color.replace('text-', 'bg-')}`} />
                        </div>
                        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className={`p-1.5 rounded-lg ${style.bgColor} ${style.color} shrink-0`}>{style.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-sm text-zinc-800">{activity.title}</h3>
                                <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-[10px] text-zinc-500">{style.label}</span>
                              </div>
                              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{activity.summary}</p>
                              {issueSummary && <p className="text-[11px] text-amber-700 mt-1">Form cues: {issueSummary}</p>}
                              <div className="flex items-center gap-2 mt-3 text-[10px] text-zinc-400">
                                <span>{time}</span>
                                <span>·</span>
                                <span className="px-2 py-0.5 rounded-full border border-zinc-200">{SOURCE_LABEL[activity.source]}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
