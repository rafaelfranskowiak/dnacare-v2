interface StatusBadgeProps {
  label: string;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

const toneClasses: Record<NonNullable<StatusBadgeProps['tone']>, string> = {
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  danger: 'border-red-500/20 bg-red-500/10 text-red-300',
  info: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
  neutral: 'border-slate-500/20 bg-slate-500/10 text-slate-300',
};

export default function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}>
      {label}
    </span>
  );
}
