import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  EyeOff, Lock, Unlock, Download, RefreshCw,
  ArrowDownRight, Clock, CheckCircle2, Loader2
} from 'lucide-react';
import { useAccount } from 'wagmi';

export function RecipientDashboard() {
  const { address } = useAccount();
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [decryptedBalance, setDecryptedBalance] = useState('');

  // Simulated transaction history (in production, fetched from events + decrypted via Nox SDK)
  const [txHistory] = useState([
    {
      id: 1,
      from: '0x742d...4c2f',
      encryptedAmount: '🔒 Encrypted',
      decryptedAmount: '$2,500.00',
      timestamp: '2026-04-05 14:32',
      type: 'reward',
    },
    {
      id: 2,
      from: '0x742d...4c2f',
      encryptedAmount: '🔒 Encrypted',
      decryptedAmount: '$1,750.00',
      timestamp: '2026-04-01 09:15',
      type: 'reward',
    },
    {
      id: 3,
      from: '0x742d...4c2f',
      encryptedAmount: '🔒 Encrypted',
      decryptedAmount: '$5,000.00',
      timestamp: '2026-03-28 16:45',
      type: 'vesting',
    },
  ]);

  // Simulate decryption via Nox JS SDK
  const handleDecrypt = async () => {
    setIsDecrypting(true);

    // In production:
    // const handleClient = await createViemHandleClient(walletClient);
    // const balance = await handleClient.decrypt(balanceHandle);
    await new Promise(resolve => setTimeout(resolve, 2000));

    setDecryptedBalance('8,750.00');
    setIsDecrypted(true);
    setIsDecrypting(false);
  };

  // Vesting schedules
  const vestingSchedules = [
    {
      id: 0,
      total: '$5,000.00',
      claimed: '$1,200.00',
      progress: 24,
      daysLeft: 22,
      startDate: '2026-03-15',
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <EyeOff className="w-5 h-5 text-nox-cyan" />
          <span className="privacy-badge">PRIVATE VIEW</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white">
          My Private Rewards
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="glass-card p-6 relative overflow-hidden"
          >
            {/* Cyan glow */}
            <div
              className="absolute inset-0 opacity-5 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at 50% 0%, #00E5CC, transparent 60%)',
              }}
            />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-nox-lightgray">
                  Confidential Balance
                </span>
                <div className="privacy-badge">
                  <Lock className="w-3 h-3" />
                  Encrypted
                </div>
              </div>

              {isDecrypted ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="text-3xl sm:text-4xl font-bold font-mono text-nox-cyan mb-1">
                    ${decryptedBalance}
                  </p>
                  <p className="text-sm text-nox-lightgray flex items-center gap-1">
                    <Unlock className="w-3.5 h-3.5 text-nox-cyan" />
                    Decrypted locally via Nox SDK
                  </p>
                </motion.div>
              ) : (
                <div className="mb-2">
                  <p className="text-3xl sm:text-4xl font-bold font-mono text-nox-lightgray/30 mb-1">
                    $••,•••.••
                  </p>
                  <p className="text-sm text-nox-lightgray">
                    Balance is encrypted on-chain
                  </p>
                </div>
              )}

              <button
                onClick={handleDecrypt}
                disabled={isDecrypting || isDecrypted}
                className={`mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  isDecrypted
                    ? 'bg-nox-cyan/10 text-nox-cyan border border-nox-cyan/30'
                    : 'btn-cyan'
                }`}
              >
                {isDecrypting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Decrypting via TEE...</>
                ) : isDecrypted ? (
                  <><CheckCircle2 className="w-4 h-4" /> Balance Revealed</>
                ) : (
                  <><Unlock className="w-4 h-4" /> Decrypt My Balance</>
                )}
              </button>

              {/* Wallet address */}
              <div className="mt-4 pt-4 border-t border-nox-border/50">
                <p className="text-xs text-nox-lightgray">Connected Wallet</p>
                <p className="text-sm font-mono text-white truncate">
                  {address || '0x...'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Vesting Card */}
          {vestingSchedules.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="glass-card p-6 mt-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-nox-gold" />
                <span className="text-sm font-semibold text-white">Vesting Schedule</span>
              </div>

              {vestingSchedules.map((schedule) => (
                <div key={schedule.id}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-nox-lightgray">Claimed / Total</span>
                    <span className="font-mono">
                      <span className="text-nox-success">{schedule.claimed}</span>
                      <span className="text-nox-lightgray"> / </span>
                      <span className="text-white">{schedule.total}</span>
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-3 rounded-full bg-nox-dark overflow-hidden mb-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${schedule.progress}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="h-full rounded-full bg-gradient-to-r from-nox-gold to-nox-deepgold relative"
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg" />
                    </motion.div>
                  </div>

                  <div className="flex justify-between text-xs text-nox-lightgray mb-4">
                    <span>{schedule.progress}% vested</span>
                    <span>{schedule.daysLeft} days remaining</span>
                  </div>

                  <button className="btn-gold w-full flex items-center justify-center gap-2 py-2.5 text-sm">
                    <Download className="w-4 h-4" />
                    Claim Available
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Transaction History */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">
                Payment History
              </h3>
              <button className="flex items-center gap-1.5 text-sm text-nox-lightgray hover:text-nox-cyan transition-colors cursor-pointer">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {/* Privacy notice */}
            <div className="p-3 rounded-xl bg-nox-cyan/5 border border-nox-cyan/10 mb-5">
              <p className="text-xs text-nox-cyan flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                Only you can see these amounts. They are decrypted locally via the Nox JS SDK.
              </p>
            </div>

            {/* Transactions */}
            <div className="space-y-3">
              {txHistory.map((tx, idx) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 + idx * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-nox-dark/40 border border-nox-border/30 hover:border-nox-cyan/20 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      tx.type === 'vesting'
                        ? 'bg-nox-gold/10'
                        : 'bg-nox-cyan/10'
                    }`}>
                      {tx.type === 'vesting' ? (
                        <Clock className="w-5 h-5 text-nox-gold" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5 text-nox-cyan" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {tx.type === 'vesting' ? 'Vesting Payment' : 'Confidential Reward'}
                        </span>
                        <span className="privacy-badge text-[10px] !py-0.5 !px-2">
                          PRIVATE
                        </span>
                      </div>
                      <span className="text-xs text-nox-lightgray">
                        From: {tx.from} · {tx.timestamp}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 ml-4">
                    {isDecrypted ? (
                      <p className="text-base font-mono font-bold text-nox-cyan">
                        +{tx.decryptedAmount}
                      </p>
                    ) : (
                      <p className="text-base font-mono text-nox-lightgray/30">
                        {tx.encryptedAmount}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Empty state */}
            {txHistory.length === 0 && (
              <div className="text-center py-12">
                <EyeOff className="w-12 h-12 text-nox-lightgray/20 mx-auto mb-4" />
                <p className="text-nox-lightgray">No rewards received yet</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
