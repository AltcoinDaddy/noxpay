import { useState } from 'react';
import { motion } from 'framer-motion';
import { Unlock, ArrowUpRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAccount, usePublicClient, useWriteContract, useWalletClient } from 'wagmi';
import { parseUnits } from 'viem';
import { CONTRACTS, CONFIDENTIAL_TOKEN_ABI, ZERO_ADDRESS } from '../config/contracts';
import { useContractConfig } from '../hooks/useContractConfig';
import { useTokenMetadata } from '../hooks/useTokenMetadata';
import toast from 'react-hot-toast';
import { createViemHandleClient } from '@iexec-nox/handle';

export function UnshieldTokens() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'idle' | 'encrypting' | 'unwrapping' | 'done'>('idle');
  const contractConfig = useContractConfig();
  const publicClient = usePublicClient();
  const { decimals, symbol, hasTokenConfig } = useTokenMetadata();
  const hasContractConfig = CONTRACTS.CONFIDENTIAL_TOKEN !== ZERO_ADDRESS;

  const { writeContractAsync, isPending } = useWriteContract();

  const handleUnshield = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (!address || !publicClient || !hasContractConfig || !hasTokenConfig || !walletClient) {
      toast.error('Connect your wallet and configure the contract addresses before unshielding.');
      return;
    }

    try {
      setStep('encrypting');
      const parsedAmount = parseUnits(amount, decimals);
      
      const handleClient = await createViemHandleClient(walletClient as any);
      
      const { handle, handleProof } = await handleClient.encryptInput(
        parsedAmount,
        'uint256',
        CONTRACTS.CONFIDENTIAL_TOKEN as `0x${string}`
      );

      setStep('unwrapping');

      const unwrapHash = await writeContractAsync({
        address: CONTRACTS.CONFIDENTIAL_TOKEN as `0x${string}`,
        abi: CONFIDENTIAL_TOKEN_ABI,
        functionName: 'unwrap',
        args: [
          address,
          address,
          handle as `0x${string}`,
          handleProof as `0x${string}`
        ],
        ...contractConfig,
      });
      await publicClient.waitForTransactionReceipt({ hash: unwrapHash });

      setStep('done');
      toast.success(
        `Submitted unwrap request for ${amount} ${symbol}. Finalize the unwrap with the returned decryption proof before expecting the ERC-20 payout.`
      );
      setAmount('');
    } catch (err: unknown) {
      console.error('Unwrap error:', err);
      toast.error('Unshielding request failed. Check your wallet or console.');
      setStep('idle');
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex items-center gap-3 mb-6 mt-6">
        <div className="flex items-center gap-2">
          <Unlock className="w-5 h-5 text-nox-cyan" />
          <span className="text-xs font-semibold text-nox-cyan bg-nox-cyan/10 border border-nox-cyan/20 px-3 py-1 rounded-full">
            UNSHIELDING
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white">
          Token Offboarding
        </h2>
      </div>

      <div className="glass-card p-6 sm:p-8 max-w-2xl border-nox-cyan/20">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-nox-cyan/20 to-nox-cyan/5 flex items-center justify-center flex-shrink-0 border border-nox-cyan/30">
            <ArrowUpRight className="w-6 h-6 text-nox-cyan" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              Unwrap Confidential Token → ERC-20
            </h3>
            <p className="text-sm text-nox-lightgray">
              Convert your confidential ERC-7984 balance back to standard tokens. 
              This only submits the first unwrap request. A real Nox wrapper still needs a later
              finalize step with the decryption proof before the ERC-20 transfer is completed.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-nox-lightgray mb-2">
              Amount to Unshield
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="nox-input pr-24 text-lg font-mono focus:border-nox-cyan/50 focus:ring-nox-cyan/20"
                min="0"
                step="0.01"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-nox-lightgray text-sm font-medium">
                {symbol}
              </span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {['100', '500', '1000', '5000'].map((val) => (
              <button
                key={val}
                onClick={() => setAmount(val)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-nox-lightgray border border-nox-border hover:border-nox-cyan hover:text-nox-cyan transition-all cursor-pointer"
              >
                {Number(val).toLocaleString()}
              </button>
            ))}
          </div>

          {step !== 'idle' && (
            <div className="flex flex-col gap-3 p-4 rounded-xl bg-nox-dark/50 border border-nox-cyan/20">
              <StepIndicator
                active={step === 'encrypting'}
                completed={step === 'unwrapping' || step === 'done'}
                loading={step === 'encrypting'}
                label="Encrypt unwrap request amount (via TEE)"
              />
              <StepIndicator
                active={step === 'unwrapping'}
                completed={step === 'done'}
                loading={isPending && step === 'unwrapping'}
                label="Submit unwrap transaction on-chain"
              />
              <StepIndicator
                active={false}
                completed={step === 'done'}
                loading={false}
                label="Unwrap submitted. Finalization still needs a proof."
              />
            </div>
          )}

          <button
            onClick={handleUnshield}
            disabled={!amount || step === 'encrypting' || step === 'unwrapping' || !address || !hasContractConfig}
            className="btn-cyan w-full flex items-center justify-center gap-2 text-base py-3.5"
          >
            {step === 'encrypting' || step === 'unwrapping' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {step === 'encrypting' ? 'Encrypting Request...' : 'Submitting Unwrap...'}
              </>
            ) : step === 'done' ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Unwrap Requested!
              </>
            ) : (
              <>
                <Unlock className="w-5 h-5" />
                Unshield Tokens
              </>
            )}
          </button>

          {!address && (
            <p className="text-center text-sm text-nox-lightgray">
              Connect your wallet to unshield tokens
            </p>
          )}
        </div>
      </div>
    </motion.section>
  );
}

function StepIndicator({ active, completed, loading, label }: {
  active: boolean; completed: boolean; loading: boolean; label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {completed ? (
        <CheckCircle2 className="w-5 h-5 text-nox-cyan flex-shrink-0" />
      ) : loading ? (
        <Loader2 className="w-5 h-5 text-nox-cyan animate-spin flex-shrink-0" />
      ) : active ? (
        <AlertCircle className="w-5 h-5 text-nox-cyan flex-shrink-0" />
      ) : (
        <div className="w-5 h-5 rounded-full border border-nox-border flex-shrink-0" />
      )}
      <span className={`text-sm ${completed ? 'text-nox-cyan' : active || loading ? 'text-white' : 'text-nox-lightgray'}`}>
        {label}
      </span>
    </div>
  );
}
