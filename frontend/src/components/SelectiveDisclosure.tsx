import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Info,
  KeyRound,
  Loader2,
  Shield,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { isAddress } from 'viem';
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from 'wagmi';
import {
  CONFIDENTIAL_TOKEN_ABI,
  CONTRACTS,
  NOXPAY_ABI,
  ZERO_ADDRESS,
  ZERO_HANDLE,
} from '../config/contracts';
import { useContractConfig } from '../hooks/useContractConfig';
import { RecoveryNotice } from './RecoveryNotice';
import toast from 'react-hot-toast';

type GrantRecord = {
  id: number;
  viewer: `0x${string}`;
  expiresAt: number;
  active: boolean;
  balanceHandle: `0x${string}`;
};

type GrantTuple = readonly [`0x${string}`, bigint, boolean, `0x${string}`];

function shortenValue(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function formatExpiry(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function extractRawErrorMessage(error: unknown) {
  const err = error as {
    shortMessage?: string;
    details?: string;
    message?: string;
    cause?: { shortMessage?: string; details?: string; message?: string };
  };

  return (
    err?.shortMessage ||
    err?.details ||
    err?.cause?.shortMessage ||
    err?.cause?.details ||
    err?.message ||
    err?.cause?.message ||
    ''
  );
}

function cleanErrorMessage(message: string) {
  return message
    .replace(/^execution reverted:?\s*/i, '')
    .replace(/^reverted with reason string\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

function isGrantTuple(value: unknown): value is GrantTuple {
  return Array.isArray(value) && value.length === 4;
}

function getGrantErrorMessage(error: unknown) {
  const rawMessage = extractRawErrorMessage(error);
  const lower = rawMessage.toLowerCase();
  const cleaned = cleanErrorMessage(rawMessage);

  if (!rawMessage) {
    return 'Grant failed. Check the wallet prompt and try again.';
  }
  if (lower.includes('user rejected')) {
    return 'Granting viewer access was cancelled in your wallet.';
  }
  if (lower.includes('unsupported chain') || lower.includes('chain mismatch')) {
    return 'Grant failed because the wallet is not on Arbitrum Sepolia.';
  }
  if (lower.includes('not a valid') || lower.includes('invalid address')) {
    return 'Grant failed because the viewer address is invalid.';
  }
  if (lower.includes('invalidduration')) {
    return 'Grant failed because the disclosure duration is invalid.';
  }

  return cleaned.length > 0 && cleaned.length <= 220
    ? `Grant failed: ${cleaned}`
    : 'Grant failed. Open the browser console for the full contract or wallet error.';
}

function getRevokeErrorMessage(error: unknown) {
  const rawMessage = extractRawErrorMessage(error);
  const lower = rawMessage.toLowerCase();
  const cleaned = cleanErrorMessage(rawMessage);

  if (!rawMessage) {
    return 'Revoke failed. Check the wallet prompt and try again.';
  }
  if (lower.includes('user rejected')) {
    return 'Revoking viewer access was cancelled in your wallet.';
  }
  if (lower.includes('grantnotactive')) {
    return 'This disclosure grant is already inactive.';
  }

  return cleaned.length > 0 && cleaned.length <= 220
    ? `Revoke failed: ${cleaned}`
    : 'Revoke failed. Open the browser console for the full contract or wallet error.';
}

function getDisclosureRecoverySteps(error: unknown, action: 'grant' | 'revoke') {
  const lower = extractRawErrorMessage(error).toLowerCase();

  if (lower.includes('user rejected')) {
    return [
      `Open the wallet prompt again and approve the ${action} transaction if you want to continue.`,
      'Stay on Arbitrum Sepolia until the transaction is signed.',
    ];
  }
  if (lower.includes('invalid address') || lower.includes('not a valid')) {
    return [
      'Paste a valid EVM wallet address for the viewer.',
      'Double-check that the viewer is not the same as the current wallet.',
    ];
  }
  if (lower.includes('invalidduration')) {
    return [
      'Use a duration greater than zero days.',
      'Try one of the preset buttons if you want a safe disclosure window.',
    ];
  }
  if (lower.includes('grantnotactive')) {
    return [
      'Refresh the grant list to confirm whether the record is already inactive.',
      'Only active grants can be revoked from this panel.',
    ];
  }

  return [
    'Confirm the wallet still has a valid confidential balance handle.',
    'Refresh the page and retry if the grant list or handle looked stale.',
  ];
}

export function SelectiveDisclosure() {
  const { address } = useAccount();
  const [viewerAddress, setViewerAddress] = useState('');
  const [durationDays, setDurationDays] = useState('7');
  const [isOpen, setIsOpen] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<{ title: string; message: string; steps: string[] } | null>(null);
  const contractConfig = useContractConfig();
  const publicClient = usePublicClient();
  const hasConfidentialTokenConfig = CONTRACTS.CONFIDENTIAL_TOKEN !== ZERO_ADDRESS;
  const hasNoxPayConfig = CONTRACTS.NOXPAY !== ZERO_ADDRESS;
  const { writeContractAsync, isPending } = useWriteContract();

  const { data: balanceHandle } = useReadContract({
    address: CONTRACTS.CONFIDENTIAL_TOKEN as `0x${string}`,
    abi: CONFIDENTIAL_TOKEN_ABI,
    functionName: 'confidentialBalanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && hasConfidentialTokenConfig), refetchInterval: 15_000 },
  });

  const { data: grantCountData } = useReadContract({
    address: CONTRACTS.NOXPAY as `0x${string}`,
    abi: NOXPAY_ABI,
    functionName: 'viewAccessGrantCount',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && hasNoxPayConfig), refetchInterval: 15_000 },
  });

  const grantIndexes = useMemo(() => {
    const count = Number(grantCountData ?? 0n);
    const start = Math.max(count - 6, 0);
    return Array.from({ length: count - start }, (_, index) => BigInt(start + index)).reverse();
  }, [grantCountData]);

  const { data: grantData } = useReadContracts({
    contracts: address
      ? grantIndexes.map((grantId) => ({
          address: CONTRACTS.NOXPAY as `0x${string}`,
          abi: NOXPAY_ABI,
          functionName: 'viewAccessGrants',
          args: [address, grantId],
        }))
      : [],
    query: {
      enabled: Boolean(address && grantIndexes.length > 0 && hasNoxPayConfig),
      refetchInterval: 15_000,
    },
  });

  const hasValidBalanceHandle = Boolean(balanceHandle && balanceHandle !== ZERO_HANDLE);
  const durationSeconds = Number(durationDays) > 0 ? BigInt(Math.round(Number(durationDays) * 86400)) : 0n;

  const grants: GrantRecord[] = [];
  grantIndexes.forEach((grantId, index) => {
    const raw = grantData?.[index]?.result;
    if (!isGrantTuple(raw)) {
      return;
    }

    grants.push({
      id: Number(grantId),
      viewer: raw[0],
      expiresAt: Number(raw[1]),
      active: raw[2],
      balanceHandle: raw[3],
    });
  });

  const handleGrantAccess = async () => {
    setActionError(null);
    if (!viewerAddress) {
      toast.error('Enter a viewer wallet address');
      return;
    }
    if (!isAddress(viewerAddress)) {
      toast.error('Enter a valid viewer wallet address');
      return;
    }
    if (viewerAddress.toLowerCase() === address?.toLowerCase()) {
      toast.error('Choose a different wallet to share this balance with.');
      return;
    }
    if (!address || !publicClient || !hasConfidentialTokenConfig || !hasNoxPayConfig) {
      toast.error('Connect your wallet and configure the contracts first');
      return;
    }
    if (!hasValidBalanceHandle || !balanceHandle) {
      toast.error('This wallet does not have a confidential balance handle to share yet');
      return;
    }
    if (durationSeconds <= 0n) {
      toast.error('Enter a valid disclosure duration.');
      return;
    }

    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.NOXPAY as `0x${string}`,
        abi: NOXPAY_ABI,
        functionName: 'grantViewAccess',
        args: [viewerAddress as `0x${string}`, durationSeconds, balanceHandle],
        ...contractConfig,
      });
      await publicClient.waitForTransactionReceipt({ hash });

      toast.success('Viewer access granted and recorded in NoxPay.');
      setViewerAddress('');
    } catch (error) {
      console.error('Grant access error:', error);
      const message = getGrantErrorMessage(error);
      setActionError({
        title: 'Disclosure grant needs another try',
        message,
        steps: getDisclosureRecoverySteps(error, 'grant'),
      });
      toast.error(message);
    }
  };

  const handleRevokeAccess = async (grantId: number) => {
    setActionError(null);
    if (!publicClient || !hasNoxPayConfig) {
      toast.error('Connect your wallet and configure the contracts first');
      return;
    }

    try {
      setRevokingId(grantId);
      const hash = await writeContractAsync({
        address: CONTRACTS.NOXPAY as `0x${string}`,
        abi: NOXPAY_ABI,
        functionName: 'revokeViewAccess',
        args: [BigInt(grantId)],
        ...contractConfig,
      });
      await publicClient.waitForTransactionReceipt({ hash });

      toast.success(`Grant #${grantId} marked inactive.`);
    } catch (error) {
      console.error('Revoke access error:', error);
      const message = getRevokeErrorMessage(error);
      setActionError({
        title: 'Disclosure revoke needs another try',
        message,
        steps: getDisclosureRecoverySteps(error, 'revoke'),
      });
      toast.error(message);
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <motion.section
      id="selective-disclosure"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 mb-4 group cursor-pointer w-full text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nox-cyan/20 to-nox-cyan/5 flex items-center justify-center">
          <KeyRound className="w-5 h-5 text-nox-cyan" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-nox-cyan transition-colors">
            Selective Disclosure
          </h2>
          <p className="text-xs text-nox-lightgray">
            Grant, track, and revoke private balance access for auditors or compliance viewers
          </p>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="text-nox-lightgray"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          {actionError && (
            <div className="max-w-3xl">
              <RecoveryNotice
                title={actionError.title}
                message={actionError.message}
                steps={actionError.steps}
                tone="warning"
              />
            </div>
          )}
          <div className="glass-card p-6 max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-nox-cyan" />
              <h3 className="text-base font-semibold text-white">
                Grant View Access
              </h3>
            </div>

            <p className="text-sm text-nox-lightgray mb-4">
              This flow records a disclosure grant in NoxPay and applies viewer access to the current confidential
              balance handle for the selected wallet.
            </p>

            <div className="grid gap-3 mb-4 sm:grid-cols-2">
              <div className="rounded-xl border border-nox-border/40 bg-nox-dark/30 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-nox-lightgray mb-1">
                  Current Handle
                </p>
                <p className="font-mono text-sm text-white break-all">
                  {hasValidBalanceHandle && balanceHandle
                    ? shortenValue(balanceHandle)
                    : 'No confidential balance yet'}
                </p>
              </div>
              <div className="rounded-xl border border-nox-border/40 bg-nox-dark/30 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-nox-lightgray mb-1">
                  Existing Grants
                </p>
                <p className="font-mono text-sm text-white">
                  {Number(grantCountData ?? 0n)}
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-xl border border-nox-cyan/10 bg-nox-cyan/5 p-3">
              <p className="text-xs text-nox-cyan flex items-start gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Viewer access is tied to the current handle only. If shielding, claiming, or other
                balance updates create a new handle, create a new disclosure grant for that new handle.
              </p>
            </div>

            <div className="grid gap-3 mb-4 sm:grid-cols-[1.6fr_0.8fr]">
              <div>
                <label className="block text-sm font-medium text-nox-lightgray mb-1.5">
                  Viewer Address
                </label>
                <input
                  type="text"
                  value={viewerAddress}
                  onChange={(e) => setViewerAddress(e.target.value)}
                  placeholder="0x..."
                  className="nox-input font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-nox-lightgray mb-1.5">
                  Duration (days)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  placeholder="7"
                  className="nox-input font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap mb-4">
              {['1', '7', '30'].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setDurationDays(days)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-nox-lightgray border border-nox-border hover:border-nox-cyan hover:text-nox-cyan transition-all cursor-pointer"
                >
                  {days} day{days === '1' ? '' : 's'}
                </button>
              ))}
            </div>

            <button
              onClick={handleGrantAccess}
              disabled={isPending || !address || !hasValidBalanceHandle || !hasNoxPayConfig}
              className="btn-cyan w-full flex items-center justify-center gap-2 py-3"
            >
              {isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Granting...</>
              ) : (
                <><Shield className="w-4 h-4" /> Grant Viewer Access</>
              )}
            </button>
          </div>

          <div className="glass-card p-6 max-w-3xl">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Recent Disclosure Grants
                </h3>
                <p className="text-sm text-nox-lightgray">
                  Latest grant records stored in NoxPay for this wallet
                </p>
              </div>
            </div>

            {grants.length === 0 ? (
              <div className="rounded-xl border border-nox-border/40 bg-nox-dark/30 p-4 text-sm text-nox-lightgray">
                No disclosure grants recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {grants.map((grant) => {
                  const isExpired = grant.expiresAt <= Math.floor(Date.now() / 1000);
                  const status = !grant.active ? 'revoked' : isExpired ? 'expired' : 'active';

                  return (
                    <div
                      key={grant.id}
                      className="rounded-xl border border-nox-border/40 bg-nox-dark/30 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-white">
                              Grant #{grant.id}
                            </p>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                                status === 'active'
                                  ? 'border-nox-success/30 bg-nox-success/10 text-nox-success'
                                  : status === 'expired'
                                    ? 'border-amber-300/30 bg-amber-300/10 text-amber-200'
                                    : 'border-rose-300/30 bg-rose-300/10 text-rose-200'
                              }`}
                            >
                              {status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-nox-lightgray">
                            Viewer: <span className="font-mono text-white">{shortenValue(grant.viewer)}</span>
                          </p>
                          <p className="text-sm text-nox-lightgray">
                            Expires: <span className="text-white">{formatExpiry(grant.expiresAt)}</span>
                          </p>
                          <p className="text-xs text-nox-lightgray break-all">
                            Handle: {shortenValue(grant.balanceHandle)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRevokeAccess(grant.id)}
                          disabled={revokingId === grant.id || !grant.active}
                          className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                            grant.active
                              ? 'border-rose-300/30 bg-rose-300/10 text-rose-200 hover:bg-rose-300/20 cursor-pointer'
                              : 'border-nox-border/40 bg-nox-dark/20 text-nox-lightgray opacity-70 cursor-not-allowed'
                          }`}
                        >
                          {revokingId === grant.id ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Revoking...</>
                          ) : (
                            <><XCircle className="w-4 h-4" /> Revoke</>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="glass-card p-6 max-w-3xl">
            <h3 className="text-base font-semibold text-white mb-3">
              Disclosure Notes
            </h3>
            <div className="space-y-3 text-sm text-nox-lightgray">
              <p>
                NoxPay stores grant records with an expiry time so you can track disclosure decisions in the app.
              </p>
              <p>
                Revoking a grant marks it inactive inside NoxPay and removes it from the app-level active list.
              </p>
              <p className="flex items-start gap-2 text-amber-100">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-200" />
                The underlying Nox viewer model is still handle-based. If a future protocol-level viewer removal flow is exposed, this panel should be extended to call that as well.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.section>
  );
}
