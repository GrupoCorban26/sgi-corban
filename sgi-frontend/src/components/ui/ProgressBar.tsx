interface ProgressBarProps {
  value: number;
  max: number;
  color: string;
}

export function ProgressBar({ value, max, color }: ProgressBarProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
