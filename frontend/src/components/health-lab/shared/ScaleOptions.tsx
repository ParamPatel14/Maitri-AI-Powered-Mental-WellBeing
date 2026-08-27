import React from 'react';

interface ScaleOptionsProps {
  labels: readonly string[];
  value: number | null;
  onChange: (value: number) => void;
  emojis?: readonly string[];
}

export const ScaleOptions: React.FC<ScaleOptionsProps> = ({ labels, value, onChange, emojis }) => (
  <div className="flex gap-2">
    {labels.map((label, i) => {
      const isSelected = value === i + 1;
      return (
        <button
          key={label}
          onClick={() => onChange(i + 1)}
          className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-sm font-medium transition-all duration-150 ${
            isSelected
              ? 'bg-violet-50 border-violet-400 text-violet-700 shadow-sm'
              : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50'
          }`}
        >
          {emojis && <span className="text-xl">{emojis[i]}</span>}
          <span className="text-xs leading-tight text-center">{label}</span>
        </button>
      );
    })}
  </div>
);

interface CheckboxGroupProps {
  options: readonly string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  columns?: number;
}

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({ options, selected, onChange, columns = 2 }) => (
  <div className={`grid grid-cols-${columns} gap-2`}>
    {options.map((option) => {
      const isChecked = selected.includes(option);
      return (
        <button
          key={option}
          onClick={() => {
            if (isChecked) {
              onChange(selected.filter(s => s !== option));
            } else {
              onChange([...selected, option]);
            }
          }}
          className={`flex items-center gap-2.5 p-3 rounded-xl border text-left text-sm transition-all duration-150 ${
            isChecked
              ? 'bg-violet-50 border-violet-400 text-violet-700'
              : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300'
          }`}
        >
          <div className={`w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-150 ${
            isChecked ? 'bg-violet-500 border-violet-500' : 'border-zinc-300'
          }`}>
            {isChecked && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          {option}
        </button>
      );
    })}
  </div>
);

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps }) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: totalSteps }, (_, i) => (
      <React.Fragment key={i}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
          i + 1 < currentStep
            ? 'bg-violet-500 text-white'
            : i + 1 === currentStep
              ? 'bg-violet-100 border-2 border-violet-500 text-violet-700'
              : 'bg-zinc-100 text-zinc-400'
        }`}>
          {i + 1 < currentStep ? '✓' : i + 1}
        </div>
        {i < totalSteps - 1 && (
          <div className={`flex-1 h-0.5 rounded-full transition-all duration-200 ${
            i + 1 < currentStep ? 'bg-violet-500' : 'bg-zinc-200'
          }`} />
        )}
      </React.Fragment>
    ))}
  </div>
);
