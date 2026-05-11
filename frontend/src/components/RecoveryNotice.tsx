import { AlertCircle, Info } from 'lucide-react';

type RecoveryNoticeTone = 'info' | 'warning' | 'danger';

interface RecoveryNoticeProps {
  title: string;
  message: string;
  steps?: string[];
  tone?: RecoveryNoticeTone;
}

export function RecoveryNotice({
  title,
  message,
  steps = [],
  tone = 'warning',
}: RecoveryNoticeProps) {
  const styles = getToneStyles(tone);

  return (
    <div className={`rounded-xl border px-4 py-3 ${styles.wrapper}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex-shrink-0 ${styles.icon}`}>
          {tone === 'info' ? <Info className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-medium ${styles.title}`}>{title}</p>
          <p className="mt-1 text-sm text-nox-lightgray leading-relaxed">{message}</p>
          {steps.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {steps.map((step) => (
                <p key={step} className="text-xs text-nox-lightgray">
                  {`\u2022 ${step}`}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getToneStyles(tone: RecoveryNoticeTone) {
  switch (tone) {
    case 'info':
      return {
        wrapper: 'border-nox-cyan/20 bg-nox-cyan/6',
        icon: 'text-nox-cyan',
        title: 'text-nox-cyan',
      };
    case 'danger':
      return {
        wrapper: 'border-rose-300/20 bg-rose-300/6',
        icon: 'text-rose-200',
        title: 'text-rose-100',
      };
    case 'warning':
    default:
      return {
        wrapper: 'border-nox-gold/20 bg-nox-gold/6',
        icon: 'text-nox-gold',
        title: 'text-nox-gold',
      };
  }
}
