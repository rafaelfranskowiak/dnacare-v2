import { ReactNode } from 'react';

interface MetricCardProps {
  icon: ReactNode;
  iconClassName: string;
  valueClassName: string;
  value: string | number;
  label: string;
  details: ReactNode;
}

export default function MetricCard({
  icon,
  iconClassName,
  valueClassName,
  value,
  label,
  details,
}: MetricCardProps) {
  return (
    <article className="rounded-2xl border border-slate-700 bg-[#20232b] p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconClassName}`}>
          {icon}
        </div>

        <div className="min-w-0">
          <div className={`text-[2rem] font-semibold leading-none tracking-tight ${valueClassName}`}>
            {value}
          </div>
          <div className="mt-1 text-sm text-slate-300">{label}</div>
          <div className="mt-1 whitespace-pre-line text-xs leading-5 text-slate-400">{details}</div>
        </div>
      </div>
    </article>
  );
}
