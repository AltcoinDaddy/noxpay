import { useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, UserPlus, Trash2, Loader2, Shield, Clock } from 'lucide-react';
import { useAccount, useWriteContract } from 'wagmi';
import { CONTRACTS, NOXPAY_ABI } from '../config/contracts';
import { useContractConfig } from '../hooks/useContractConfig';
import toast from 'react-hot-toast';

export function SelectiveDisclosure() {
  const { address } = useAccount();
  const [viewerAddress, setViewerAddress] = useState('');
  const [accessDuration, setAccessDuration] = useState('24');
  const [isOpen, setIsOpen] = useState(false);
  const contractConfig = useContractConfig();

  const { writeContract: grantAccess, isPending: isGranting } = useWriteContract();
  const { writeContract: revokeAccess, isPending: isRevoking } = useWriteContract();

  // Demo active grants
  const [activeGrants] = useState([
    {
      id: 0,
      viewer: '0x8f3c...a91b',
      expiresAt: '2026-04-08 14:00',
      label: 'Auditor',
    },
  ]);

  const handleGrantAccess = async () => {
    if (!viewerAddress) {
      toast.error('Enter an auditor wallet address');
      return;
    }

    try {
      const durationSeconds = BigInt(parseInt(accessDuration) * 3600);
      const demoHandle = '0x' + '0'.repeat(64) as `0x${string}`;

      grantAccess({
        address: CONTRACTS.NOXPAY as `0x${string}`,
        abi: NOXPAY_ABI,
        functionName: 'grantViewAccess',
        args: [
          viewerAddress as `0x${string}`,
          durationSeconds,
          demoHandle,
        ],
        ...contractConfig,
      });

      toast.success('View access granted! 🔓');
      setViewerAddress('');
    } catch {
      toast.error('Failed to grant access');
    }
  };

  const handleRevokeAccess = async (grantId: number) => {
    try {
      revokeAccess({
        address: CONTRACTS.NOXPAY as `0x${string}`,
        abi: NOXPAY_ABI,
        functionName: 'revokeViewAccess',
        args: [BigInt(grantId)],
        ...contractConfig,
      });

      toast.success('Access revoked');
    } catch {
      toast.error('Failed to revoke access');
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      {/* Collapsible header */}
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
            Grant temporary view access for compliance & auditing
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
          {/* Grant new access */}
          <div className="glass-card p-6 max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-nox-cyan" />
              <h3 className="text-base font-semibold text-white">
                Grant View Access
              </h3>
            </div>

            <p className="text-sm text-nox-lightgray mb-4">
              Allow an auditor or compliance officer to temporarily view your encrypted
              balance and transaction details via the Nox ACL system.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-nox-lightgray mb-1.5">
                  Viewer Address (auditor wallet)
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
                  Access Duration
                </label>
                <div className="flex gap-2">
                  {['1', '6', '24', '72', '168'].map((hours) => (
                    <button
                      key={hours}
                      onClick={() => setAccessDuration(hours)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        accessDuration === hours
                          ? 'bg-nox-cyan/10 text-nox-cyan border border-nox-cyan/30'
                          : 'text-nox-lightgray border border-nox-border hover:border-nox-cyan/30'
                      }`}
                    >
                      {parseInt(hours) < 24
                        ? `${hours}h`
                        : `${parseInt(hours) / 24}d`}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGrantAccess}
                disabled={isGranting || !address}
                className="btn-cyan w-full flex items-center justify-center gap-2 py-3"
              >
                {isGranting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Granting...</>
                ) : (
                  <><Shield className="w-4 h-4" /> Grant Temporary Access</>
                )}
              </button>
            </div>
          </div>

          {/* Active Grants */}
          {activeGrants.length > 0 && (
            <div className="glass-card p-6 max-w-2xl">
              <h3 className="text-base font-semibold text-white mb-4">
                Active Access Grants
              </h3>

              <div className="space-y-3">
                {activeGrants.map((grant) => (
                  <div
                    key={grant.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-nox-dark/40 border border-nox-border/30"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-nox-cyan/10 flex items-center justify-center flex-shrink-0">
                        <KeyRound className="w-4 h-4 text-nox-cyan" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">
                            {grant.label}
                          </span>
                          <span className="text-[10px] font-mono text-nox-lightgray">
                            {grant.viewer}
                          </span>
                        </div>
                        <span className="text-xs text-nox-lightgray flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Expires: {grant.expiresAt}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeAccess(grant.id)}
                      disabled={isRevoking}
                      className="p-2 text-nox-lightgray hover:text-red-400 transition-colors cursor-pointer"
                      title="Revoke Access"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.section>
  );
}
