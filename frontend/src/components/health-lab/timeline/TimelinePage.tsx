import React from 'react';
import { Clock, FlaskConical, Sparkles, Target, TrendingUp, Star, Zap, Activity, CalendarCheck } from 'lucide-react';
import { useHealthLab } from '../../../context/HealthLabContext';
import { SectionHeader, EmptyState } from '../shared/GlassCard';
import { formatDisplayDate } from '../../../lib/date-utils';
import type { TimelineEvent, TimelineEventType } from '../../../types/health-lab';

const EVENT_CONFIG: Record<TimelineEventType, { icon: React.ReactNode; color: string; bgColor: string }> = {
  data_collection_started: { icon: <CalendarCheck className="w-4 h-4" />, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  pattern_discovered: { icon: <Sparkles className="w-4 h-4" />, color: 'text-violet-600', bgColor: 'bg-violet-100' },
  experiment_started: { icon: <FlaskConical className="w-4 h-4" />, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  experiment_completed: { icon: <FlaskConical className="w-4 h-4" />, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  experiment_failed: { icon: <FlaskConical className="w-4 h-4" />, color: 'text-zinc-500', bgColor: 'bg-zinc-100' },
  future_predicted: { icon: <TrendingUp className="w-4 h-4" />, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  baseline_computed: { icon: <Target className="w-4 h-4" />, color: 'text-rose-600', bgColor: 'bg-rose-100' },
  milestone_reached: { icon: <Star className="w-4 h-4" />, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  insight_learned: { icon: <Zap className="w-4 h-4" />, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  checkin_streak: { icon: <Activity className="w-4 h-4" />, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
};

export const TimelinePage: React.FC = () => {
  const { timeline, profile } = useHealthLab();

  // Auto-generate initial event if timeline is empty and profile exists
  const sortedEvents = [...timeline].sort((a, b) => a.date.localeCompare(b.date));

  // Group events by date
  const groupedEvents = sortedEvents.reduce<Record<string, TimelineEvent[]>>((groups, event) => {
    if (!groups[event.date]) groups[event.date] = [];
    groups[event.date].push(event);
    return groups;
  }, {});

  const dates = Object.keys(groupedEvents).sort();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <SectionHeader
        title="Your Health Journey"
        subtitle="A timeline of discoveries and milestones"
      />

      {!profile ? (
        <EmptyState
          icon={<Clock className="w-8 h-8" />}
          title="No journey yet"
          description="Complete onboarding to start your health journey timeline."
        />
      ) : sortedEvents.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-violet-50 border border-violet-200 mb-4">
            <Clock className="w-5 h-5 text-violet-600" />
            <span className="text-sm font-medium text-violet-700">Your journey begins here</span>
          </div>
          <p className="text-xs text-zinc-400 max-w-md mx-auto mb-6">
            As you use the Health Lab — checking in, discovering patterns, running experiments — your journey will unfold here as a timeline of discoveries and milestones.
          </p>
          <div className="space-y-3 text-left max-w-sm mx-auto">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-zinc-200">
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600"><CalendarCheck className="w-4 h-4" /></div>
              <div>
                <div className="text-xs font-semibold text-zinc-700">Start checking in daily</div>
                <div className="text-[10px] text-zinc-400">Your first entries will appear here</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-zinc-200">
              <div className="p-1.5 rounded-lg bg-violet-100 text-violet-600"><Sparkles className="w-4 h-4" /></div>
              <div>
                <div className="text-xs font-semibold text-zinc-700">Discover your patterns</div>
                <div className="text-[10px] text-zinc-400">AI finds what makes you feel good</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-zinc-200">
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600"><FlaskConical className="w-4 h-4" /></div>
              <div>
                <div className="text-xs font-semibold text-zinc-700">Run experiments</div>
                <div className="text-[10px] text-zinc-400">Test what actually works for you</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-zinc-200" />

          <div className="space-y-8">
            {dates.map((date) => (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center gap-3 mb-4 relative">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-zinc-200 flex items-center justify-center z-10">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 font-medium">{formatDisplayDate(date)}</div>
                </div>

                {/* Events for this date */}
                <div className="space-y-3 ml-6 pl-8">
                  {groupedEvents[date].map((event) => {
                    const config = EVENT_CONFIG[event.type];
                    return (
                      <div key={event.id} className="relative">
                        {/* Dot on timeline */}
                        <div className={`absolute -left-10 top-3 w-4 h-4 rounded-full ${config.bgColor} border-2 border-white flex items-center justify-center`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${config.color.replace('text-', 'bg-')}`} />
                        </div>

                        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className={`p-1.5 rounded-lg ${config.bgColor} ${config.color} shrink-0`}>
                              {config.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm text-zinc-800">{event.title}</h3>
                              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{event.description}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
