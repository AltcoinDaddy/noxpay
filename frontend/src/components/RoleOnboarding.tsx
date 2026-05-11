import { motion } from 'framer-motion';
import { ArrowRight, Eye, KeyRound, Landmark, User } from 'lucide-react';

type ViewMode = 'landing' | 'treasury' | 'recipient';
type RoleKey = 'treasury' | 'recipient' | 'auditor';

interface RoleOnboardingProps {
  activeView: ViewMode;
  isConnected: boolean;
  onViewChange: (view: ViewMode) => void;
  onOpenDisclosure: () => void;
}

type RoleCardConfig = {
  key: RoleKey;
  title: string;
  eyebrow: string;
  description: string;
  outcomes: string[];
  icon: React.ReactNode;
  accentClass: string;
  surfaceClass: string;
  ctaLabel: string;
  ctaAction: () => void;
};

export function RoleOnboarding({
  activeView,
  isConnected,
  onViewChange,
  onOpenDisclosure,
}: RoleOnboardingProps) {
  const isCompact = isConnected && activeView !== 'landing';
  const activeRole: RoleKey | null =
    activeView === 'treasury' ? 'treasury' : activeView === 'recipient' ? 'recipient' : null;

  const roleCards: RoleCardConfig[] = [
    {
      key: 'treasury',
      title: 'Treasury',
      eyebrow: 'For team operators',
      description:
        'Fund the demo, shield treasury balances, and send confidential rewards without exposing every recipient amount publicly.',
      outcomes: [
        'Claim or deposit mock USDC, then shield it into the confidential token.',
        'Send single rewards, batch payouts, or vesting schedules from one treasury surface.',
        'Use readiness checks before signing so chain or operator issues are caught early.',
      ],
      icon: <Landmark className="w-5 h-5" />,
      accentClass: 'text-nox-gold border-nox-gold/30 bg-nox-gold/10',
      surfaceClass: 'from-nox-gold/15 via-transparent to-transparent',
      ctaLabel: isConnected ? 'Open Treasury View' : 'Treasury flow starts here',
      ctaAction: () => onViewChange('treasury'),
    },
    {
      key: 'recipient',
      title: 'Recipient',
      eyebrow: 'For private payouts',
      description:
        'Decrypt only when you choose, track confidential rewards, claim vested balances, and unshield back to standard ERC-20 when needed.',
      outcomes: [
        'See masked balances first so sensitive values stay hidden until you authorize decryption.',
        'Claim vested rewards privately once they become available.',
        'Unshield back into standard mock USDC after the confidential balance is ready.',
      ],
      icon: <User className="w-5 h-5" />,
      accentClass: 'text-nox-cyan border-nox-cyan/30 bg-nox-cyan/10',
      surfaceClass: 'from-nox-cyan/15 via-transparent to-transparent',
      ctaLabel: isConnected ? 'Open Recipient View' : 'Recipient flow starts here',
      ctaAction: () => onViewChange('recipient'),
    },
    {
      key: 'auditor',
      title: 'Auditor / Viewer',
      eyebrow: 'For approved reviewers',
      description:
        'Review private balances only after the wallet owner grants temporary access. NoxPay keeps this explicit so disclosure stays intentional.',
      outcomes: [
        'Wait for a temporary disclosure grant from the owner wallet.',
        'Use the Selective Disclosure panel to confirm who has access and for how long.',
        'Decrypt only the approved balance handle during the granted time window.',
      ],
      icon: <KeyRound className="w-5 h-5" />,
      accentClass: 'text-nox-success border-nox-success/30 bg-nox-success/10',
      surfaceClass: 'from-nox-success/15 via-transparent to-transparent',
      ctaLabel: isConnected ? 'Open Disclosure Flow' : 'Auditor flow uses disclosure',
      ctaAction: onOpenDisclosure,
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: isCompact ? 0.05 : 0.35 }}
      className={isCompact ? 'pt-8' : 'max-w-6xl mx-auto mt-20 sm:mt-24'}
    >
      <div className="glass-card p-6 sm:p-8 overflow-hidden relative">
        <div
          className={`absolute inset-0 pointer-events-none bg-gradient-to-br ${
            isCompact ? 'from-nox-cyan/6 via-transparent to-nox-gold/6' : 'from-nox-gold/6 via-transparent to-nox-cyan/6'
          }`}
        />

        <div className="relative z-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-nox-border/60 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-nox-lightgray">
                <Eye className="w-3.5 h-3.5" />
                Role Guide
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mt-3">
                {isCompact ? 'Know what each role can do' : 'Choose your path through NoxPay'}
              </h2>
              <p className="text-sm sm:text-base text-nox-lightgray mt-2 max-w-2xl leading-relaxed">
                {isCompact
                  ? 'NoxPay works best when each person understands their job in the privacy flow. Treasury funds and pays, recipients decrypt and claim, and auditors only see what is explicitly shared.'
                  : 'Whether you are funding rewards, receiving a private payout, or reviewing a disclosure grant, the app is easier to navigate when each role has a clear next step.'}
              </p>
            </div>

            {isConnected && activeRole && (
              <div className="rounded-2xl border border-nox-border/50 bg-nox-dark/40 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-nox-lightgray mb-1">
                  Current focus
                </p>
                <p className="text-sm font-semibold text-white">
                  {activeRole === 'treasury' ? 'Treasury Mode' : 'Recipient Mode'}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {roleCards.map((role) => {
              const isActive = activeRole === role.key;

              return (
                <div
                  key={role.key}
                  className={`rounded-2xl border p-5 relative overflow-hidden ${
                    isActive
                      ? 'border-white/20 bg-white/6 shadow-[0_0_30px_rgba(255,255,255,0.03)]'
                      : 'border-nox-border/50 bg-nox-dark/35'
                  }`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${role.surfaceClass}`} />
                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${role.accentClass}`}>
                        {role.icon}
                        <span className="text-sm font-semibold">{role.title}</span>
                      </div>
                      {isActive && (
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
                          Current
                        </span>
                      )}
                    </div>

                    <p className="text-xs uppercase tracking-[0.18em] text-nox-lightgray mb-2">
                      {role.eyebrow}
                    </p>
                    <p className="text-sm text-nox-lightgray leading-relaxed mb-4">
                      {role.description}
                    </p>

                    <div className="space-y-2.5 mb-5">
                      {role.outcomes.map((outcome) => (
                        <div key={outcome} className="flex items-start gap-2.5 text-sm text-white/90">
                          <span className={`mt-1 h-2 w-2 rounded-full ${getDotClass(role.key)}`} />
                          <span>{outcome}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={role.ctaAction}
                      className={`w-full inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all cursor-pointer ${
                        role.key === 'treasury'
                          ? 'border-nox-gold/30 bg-nox-gold/12 text-nox-gold hover:bg-nox-gold/18'
                          : role.key === 'recipient'
                            ? 'border-nox-cyan/30 bg-nox-cyan/12 text-nox-cyan hover:bg-nox-cyan/18'
                            : 'border-nox-success/30 bg-nox-success/12 text-nox-success hover:bg-nox-success/18'
                      }`}
                    >
                      {role.ctaLabel}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function getDotClass(role: RoleKey) {
  switch (role) {
    case 'treasury':
      return 'bg-nox-gold';
    case 'recipient':
      return 'bg-nox-cyan';
    case 'auditor':
      return 'bg-nox-success';
  }
}
