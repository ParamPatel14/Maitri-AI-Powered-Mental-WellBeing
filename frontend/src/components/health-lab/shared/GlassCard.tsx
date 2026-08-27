import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', hover = false }) => (
  <div className={`bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm ${hover ? 'hover:border-zinc-300 hover:shadow-md transition-all duration-200' : ''} ${className}`}>
    {children}
  </div>
);

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      {subtitle && <p className="text-zinc-500 text-sm mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
);

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="p-4 rounded-2xl bg-zinc-100 border border-zinc-200 mb-4 text-zinc-400">
      {icon}
    </div>
    <h3 className="font-semibold text-lg mb-1">{title}</h3>
    <p className="text-zinc-500 text-sm max-w-sm mb-6">{description}</p>
    {action}
  </div>
);

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-4">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-violet-500" />
    <p className="text-zinc-500 text-sm">{message}</p>
  </div>
);
