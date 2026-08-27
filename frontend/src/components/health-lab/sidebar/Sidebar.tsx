import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  MessageCircle,
  CheckSquare,
  Target,
  Database,
  Brain,
  Sparkles,
  FlaskConical,
  HelpCircle,
  User,
  ArrowLeft,
} from 'lucide-react';

const PRIMARY_NAV = [
  { to: '/health-lab/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/health-lab/checkin', icon: CalendarCheck, label: 'Quick Check-in' },
  { to: '/health-lab/chat', icon: MessageCircle, label: 'AI Check-in' },
  { to: '/health-lab/habits', icon: CheckSquare, label: 'Habits' },
];

const INSIGHTS_NAV = [
  { to: '/health-lab/baseline', icon: Target, label: 'My Baseline' },
  { to: '/health-lab/cognitive', icon: Brain, label: 'Cognitive Tests' },
  { to: '/health-lab/datasources', icon: Database, label: 'Data Sources' },
  { to: '/health-lab/insights', icon: Sparkles, label: 'AI Insights' },
];

const EXPLORE_NAV = [
  { to: '/health-lab/experiments', icon: FlaskConical, label: 'Experiments' },
  { to: '/health-lab/what-if', icon: HelpCircle, label: 'What-If' },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-60 shrink-0 h-full bg-white border-r border-zinc-200 flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-zinc-100">
        <NavLink
          to="/"
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-600 transition-colors text-xs font-medium mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Home
        </NavLink>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-violet-100 border border-violet-200">
            <Brain className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight">Health Lab</div>
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider">AI Personal Wellness</div>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        <div>
          <div className="px-3 mb-1 text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Daily</div>
          {PRIMARY_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-violet-50 text-violet-700 border border-violet-200'
                    : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>

        <div>
          <div className="px-3 mb-1 text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Understand</div>
          {INSIGHTS_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-violet-50 text-violet-700 border border-violet-200'
                    : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>

        <div>
          <div className="px-3 mb-1 text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Explore</div>
          {EXPLORE_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-violet-50 text-violet-700 border border-violet-200'
                    : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-100">
        <NavLink
          to="/health-lab/profile"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
              isActive
                ? 'bg-zinc-100 text-zinc-800 border border-zinc-200'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
            }`
          }
        >
          <User className="w-4.5 h-4.5" />
          Profile
        </NavLink>
      </div>
    </aside>
  );
};
