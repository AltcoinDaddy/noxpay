import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Landmark, Send, Users as UsersIcon, Plus, Trash2, Loader2,
  Clock, CalendarDays, Layers3, Sparkles, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useAccount, useChainId, usePublicClient, useReadContract, useWriteContract, useWalletClient } from 'wagmi';
import { createViemHandleClient } from '@iexec-nox/handle';
import { isAddress, parseUnits } from 'viem';
import { arbitrumSepolia } from 'wagmi/chains';
import {
  CONTRACTS,
  NOXPAY_ABI,
  ZERO_ADDRESS,
} from '../config/contracts';
import { useContractConfig } from '../hooks/useContractConfig';
import { useTokenMetadata } from '../hooks/useTokenMetadata';
import { RecoveryNotice } from './RecoveryNotice';
import toast from 'react-hot-toast';

interface Recipient {
  id: string;
  address: string;
  amount: string;
}

export function TreasuryDashboard() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const [mode, setMode] = useState<'single' | 'batch' | 'vesting'>('single');

  // Single payment
  const [recipientAddr, setRecipientAddr] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');

  // Batch payment
  const [batchRecipients, setBatchRecipients] = useState<Recipient[]>([
    { id: '1', address: '', amount: '' },
  ]);

  // Vesting
  const [vestingAddr, setVestingAddr] = useState('');
  const [vestingAmount, setVestingAmount] = useState('');
  const [vestingDays, setVestingDays] = useState('30');
  const [actionError, setActionError] = useState<{ title: string; message: string; steps: string[] } | null>(null);
  const contractConfig = useContractConfig();
  const publicClient = usePublicClient();
  const { decimals, symbol } = useTokenMetadata();
  const hasContractConfig = CONTRACTS.NOXPAY !== ZERO_ADDRESS;
  const hasCorrectChain = chainId === arbitrumSepolia.id;

  const { data: treasuryAddress } = useReadContract({
    address: CONTRACTS.NOXPAY as `0x${string}`,
    abi: NOXPAY_ABI,
    functionName: 'treasury',
    query: { enabled: hasContractConfig },
  });

  const { data: operatorApprovalData } = useReadContract({
    address: CONTRACTS.NOXPAY as `0x${string}`,
    abi: NOXPAY_ABI,
    functionName: 'hasTreasuryOperatorApproval',
    query: { enabled: hasContractConfig && hasCorrectChain },
  });

  const isTreasuryWallet = Boolean(
    address &&
    treasuryAddress &&
    address.toLowerCase() === treasuryAddress.toLowerCase()
  );
  const hasTreasuryOperatorApproval = Boolean(operatorApprovalData);
  const treasuryReadyForPayouts =
    Boolean(address) &&
    hasCorrectChain &&
    hasContractConfig &&
    Boolean(walletClient) &&
    isTreasuryWallet &&
    hasTreasuryOperatorApproval;

  const { writeContractAsync: writeContractAsync, isPending } = useWriteContract();

  const ensureConfidentialFlowsReady = () => {
    setActionError(null);
    if (!address || !publicClient || !hasContractConfig || !walletClient) {
      toast.error('Connect your wallet and configure the NoxPay contract first.');
      return false;
    }
    if (!hasCorrectChain) {
      toast.error('Switch your wallet to Arbitrum Sepolia first.');
      return false;
    }
    if (!isTreasuryWallet) {
      toast.error('Connect the configured treasury wallet before sending rewards or creating vesting.');
      return false;
    }
    if (!hasTreasuryOperatorApproval) {
      toast.error('Treasury setup is incomplete. Call setOperator on the confidential token first.');
      return false;
    }
    return true;
  };

  const handleSendSingle = async () => {
    setActionError(null);
    if (!recipientAddr || !paymentAmount) {
      toast.error('Please fill in all fields');
      return;
    }
    if (!isAddress(recipientAddr)) {
      toast.error('Enter a valid recipient address');
      return;
    }
    if (parseFloat(paymentAmount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (!ensureConfidentialFlowsReady()) {
      return;
    }

    try {
      const handleClient = await createViemHandleClient(walletClient as any);
      const parsedAmount = parseUnits(paymentAmount, decimals);

      const { handle, handleProof } = await handleClient.encryptInput(
        parsedAmount,
        'uint256',
        CONTRACTS.NOXPAY
      );

      const hash = await writeContractAsync({
        address: CONTRACTS.NOXPAY as `0x${string}`,
        abi: NOXPAY_ABI,
        functionName: 'sendConfidentialReward',
        args: [
          recipientAddr as `0x${string}`,
          handle as `0x${string}`,
          handleProof as `0x${string}`,
          parsedAmount,
        ],
        ...contractConfig,
      });
      await publicClient!.waitForTransactionReceipt({ hash });

      toast.success('Confidential reward transaction confirmed.');
      setRecipientAddr('');
      setPaymentAmount('');
    } catch (error) {
      console.error('Single reward error:', error);
      const details = getTreasuryErrorDetails(error, 'single', symbol);
      setActionError(details);
      toast.error(details.message);
    }
  };

  const handleSendBatch = async () => {
    setActionError(null);
    const validRecipients = batchRecipients.filter(r => r.address && r.amount);
    if (validRecipients.length === 0) {
      toast.error('Add at least one recipient');
      return;
    }
    if (validRecipients.some((recipient) => !isAddress(recipient.address))) {
      toast.error('Every recipient row needs a valid wallet address');
      return;
    }
    if (validRecipients.some((recipient) => parseFloat(recipient.amount) <= 0)) {
      toast.error('Every recipient row needs a valid amount');
      return;
    }
    if (!ensureConfidentialFlowsReady()) {
      return;
    }

    try {
      const handleClient = await createViemHandleClient(walletClient as any);
      
      const addresses = validRecipients.map(r => r.address as `0x${string}`);
      const amounts = validRecipients.map(r => parseUnits(r.amount, decimals));
      
      const handles: `0x${string}`[] = [];
      const proofs: `0x${string}`[] = [];

      for (const amount of amounts) {
        const { handle, handleProof } = await handleClient.encryptInput(
          amount,
          'uint256',
          CONTRACTS.NOXPAY
        );
        handles.push(handle as `0x${string}`);
        proofs.push(handleProof as `0x${string}`);
      }

      const hash = await writeContractAsync({
        address: CONTRACTS.NOXPAY as `0x${string}`,
        abi: NOXPAY_ABI,
        functionName: 'sendBatchRewards',
        args: [addresses, handles, proofs, amounts],
        ...contractConfig,
      });
      await publicClient!.waitForTransactionReceipt({ hash });

      toast.success(`Batch payment confirmed for ${validRecipients.length} recipients.`);
      setBatchRecipients([{ id: '1', address: '', amount: '' }]);
    } catch (error) {
      console.error('Batch reward error:', error);
      const details = getTreasuryErrorDetails(error, 'batch', symbol);
      setActionError(details);
      toast.error(details.message);
    }
  };

  const handleCreateVesting = async () => {
    setActionError(null);
    if (!vestingAddr || !vestingAmount || !vestingDays) {
      toast.error('Please fill in all vesting fields');
      return;
    }
    if (!isAddress(vestingAddr)) {
      toast.error('Enter a valid recipient address');
      return;
    }
    if (parseFloat(vestingAmount) <= 0 || parseInt(vestingDays, 10) <= 0) {
      toast.error('Enter a valid amount and duration');
      return;
    }
    if (!ensureConfidentialFlowsReady()) {
      return;
    }

    try {
      const handleClient = await createViemHandleClient(walletClient as any);
      const parsedAmount = parseUnits(vestingAmount, decimals);

      const { handle, handleProof } = await handleClient.encryptInput(
        parsedAmount,
        'uint256',
        CONTRACTS.NOXPAY
      );
      
      const durationSeconds = BigInt(parseInt(vestingDays) * 86400);

      const hash = await writeContractAsync({
        address: CONTRACTS.NOXPAY as `0x${string}`,
        abi: NOXPAY_ABI,
        functionName: 'createVestingSchedule',
        args: [
          vestingAddr as `0x${string}`,
          handle as `0x${string}`,
          handleProof as `0x${string}`,
          parsedAmount,
          durationSeconds,
        ],
        ...contractConfig,
      });
      await publicClient!.waitForTransactionReceipt({ hash });

      toast.success('Vesting schedule transaction confirmed.');
      setVestingAddr('');
      setVestingAmount('');
      setVestingDays('30');
    } catch (error) {
      console.error('Vesting creation error:', error);
      const details = getTreasuryErrorDetails(error, 'vesting', symbol);
      setActionError(details);
      toast.error(details.message);
    }
  };

  const addBatchRecipient = () => {
    setBatchRecipients([
      ...batchRecipients,
      { id: Date.now().toString(), address: '', amount: '' },
    ]);
  };

  const removeBatchRecipient = (id: string) => {
    if (batchRecipients.length > 1) {
      setBatchRecipients(batchRecipients.filter(r => r.id !== id));
    }
  };

  const updateBatchRecipient = (id: string, field: 'address' | 'amount', value: string) => {
    setBatchRecipients(
      batchRecipients.map(r => r.id === id ? { ...r, [field]: value } : r)
    );
  };

  const batchTotal = batchRecipients
    .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
    .toFixed(2);
  const singleAmountValue = parseFloat(paymentAmount) || 0;
  const vestingAmountValue = parseFloat(vestingAmount) || 0;
  const vestingDaysValue = parseInt(vestingDays, 10) || 0;
  const readyChecks = [
    { label: 'Wallet connected', ok: Boolean(address) },
    { label: 'Arbitrum Sepolia selected', ok: hasCorrectChain },
    { label: 'NoxPay deployed', ok: hasContractConfig },
    { label: 'Wallet client ready', ok: Boolean(walletClient) },
    { label: 'Treasury wallet connected', ok: isTreasuryWallet },
    { label: 'Treasury operator approval', ok: hasTreasuryOperatorApproval },
  ];
  const modeSummary = mode === 'single'
    ? `${singleAmountValue.toFixed(2)} ${symbol} ready for one recipient`
    : mode === 'batch'
      ? `${batchRecipients.filter((recipient) => recipient.address && recipient.amount).length} recipients, ${batchTotal} ${symbol} total`
      : vestingDaysValue > 0
        ? `${vestingAmountValue.toFixed(2)} ${symbol} over ${vestingDaysValue} days`
        : `Set an amount and duration to preview the vesting plan`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nox-gold/20 to-nox-deepgold/10 flex items-center justify-center">
          <Landmark className="w-5 h-5 text-nox-gold" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Treasury Dashboard
          </h2>
          <p className="text-xs text-nox-lightgray">
            Send confidential rewards and create vesting schedules
          </p>
        </div>
      </div>

      <div className="glass-card p-6 sm:p-7 max-w-3xl mb-6 border-nox-gold/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-nox-gold" />
              <span className="text-xs font-semibold tracking-[0.18em] uppercase text-nox-gold">
                Payout Planner
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Build the next confidential payout with fewer manual steps
            </h3>
            <p className="text-sm text-nox-lightgray">
              This panel keeps the treasury flow demo-friendly: it shows whether the wallet is ready,
              summarizes the active payout mode, and gives quick presets for common reward and vesting sizes.
            </p>
          </div>

          <div className="rounded-2xl border border-nox-border/40 bg-nox-dark/30 p-4 min-w-0 lg:w-[320px]">
            <div className="flex items-center gap-2 mb-3">
              <Layers3 className="w-4 h-4 text-nox-cyan" />
              <span className="text-sm font-semibold text-white">Current Plan</span>
            </div>
            <p className="text-sm text-nox-lightgray mb-3">
              {modeSummary}
            </p>
            <div className="space-y-2">
              {readyChecks.map((check) => (
                <div key={check.label} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-nox-lightgray">{check.label}</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${check.ok ? 'text-nox-cyan' : 'text-nox-warning'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {check.ok ? 'Ready' : 'Check'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!treasuryReadyForPayouts && (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 px-4 py-4 mb-6 max-w-3xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-200 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-amber-100">
                Treasury actions are not fully ready yet.
              </p>
              {!address && (
                <p className="text-nox-lightgray">
                  Connect the treasury wallet to prepare confidential payouts.
                </p>
              )}
              {address && !hasCorrectChain && (
                <p className="text-nox-lightgray">
                  Switch the connected wallet to Arbitrum Sepolia.
                </p>
              )}
              {address && treasuryAddress && !isTreasuryWallet && (
                <p className="text-nox-lightgray">
                  Connected wallet does not match the configured treasury.
                  Expected treasury: <span className="font-mono text-white">{treasuryAddress}</span>
                </p>
              )}
              {address && isTreasuryWallet && !hasTreasuryOperatorApproval && (
                <div className="text-nox-lightgray">
                  <p>
                    Treasury operator approval is missing.
                  </p>
                  <p className="mt-1 font-mono text-white break-all">
                    setOperator({CONTRACTS.NOXPAY}, &lt;future-unix-timestamp&gt;)
                  </p>
                  <p className="mt-1">
                    Call that on the confidential token contract before sending rewards or creating vesting schedules.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {actionError && (
        <div className="max-w-3xl mb-6">
          <RecoveryNotice
            title={actionError.title}
            message={actionError.message}
            steps={actionError.steps}
            tone="warning"
          />
        </div>
      )}

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <TabButton
          active={mode === 'single'}
          onClick={() => setMode('single')}
          icon={<Send className="w-4 h-4" />}
          label="Single Payment"
        />
        <TabButton
          active={mode === 'batch'}
          onClick={() => setMode('batch')}
          icon={<UsersIcon className="w-4 h-4" />}
          label="Batch Payment"
        />
        <TabButton
          active={mode === 'vesting'}
          onClick={() => setMode('vesting')}
          icon={<Clock className="w-4 h-4" />}
          label="Vesting"
        />
      </div>

      <AnimatePresence mode="wait">
        {/* Single Payment */}
        {mode === 'single' && (
          <motion.div
            key="single"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="glass-card p-6 sm:p-8 max-w-2xl"
          >
            <h3 className="text-lg font-semibold text-white mb-1">
              Send Confidential Reward
            </h3>
            <p className="text-sm text-nox-lightgray mb-6">
              The amount will be encrypted — only the recipient can view it
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-nox-lightgray mb-2">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={recipientAddr}
                  onChange={(e) => setRecipientAddr(e.target.value)}
                  placeholder="0x..."
                  className="nox-input font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-nox-lightgray mb-2">
                  Amount (encrypted on-chain)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="nox-input pr-20 font-mono"
                    min="0"
                    step="0.01"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-nox-lightgray text-sm">
                    {symbol}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap mt-3">
                  {['25', '100', '250', '500'].map((value) => (
                    <button
                      key={value}
                      onClick={() => setPaymentAmount(value)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-nox-lightgray border border-nox-border hover:border-nox-gold hover:text-nox-gold transition-all cursor-pointer"
                    >
                      {Number(value).toLocaleString()} {symbol}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-nox-cyan/5 border border-nox-cyan/10">
                <p className="text-xs text-nox-cyan flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-nox-cyan inline-block pulse-cyan" />
                  Amount will be encrypted via Nox TEE before on-chain submission
                </p>
              </div>

              <button
                onClick={handleSendSingle}
                disabled={isPending || !treasuryReadyForPayouts}
                className="btn-gold w-full flex items-center justify-center gap-2 py-3.5"
              >
                {isPending ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="w-5 h-5" /> Send Confidential Reward</>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Batch Payment */}
        {mode === 'batch' && (
          <motion.div
            key="batch"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="glass-card p-6 sm:p-8 max-w-3xl"
          >
            <h3 className="text-lg font-semibold text-white mb-1">
              Batch Confidential Payments
            </h3>
            <p className="text-sm text-nox-lightgray mb-6">
              Send encrypted rewards to multiple recipients in one transaction
            </p>

            <div className="space-y-3 mb-4">
              {batchRecipients.map((recipient, idx) => (
                <motion.div
                  key={recipient.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex gap-3 items-end"
                >
                  <div className="flex-1 min-w-0">
                    {idx === 0 && (
                      <label className="block text-xs font-medium text-nox-lightgray mb-1.5">
                        Address
                      </label>
                    )}
                    <input
                      type="text"
                      value={recipient.address}
                      onChange={(e) => updateBatchRecipient(recipient.id, 'address', e.target.value)}
                      placeholder="0x..."
                      className="nox-input font-mono text-sm py-2.5"
                    />
                  </div>
                  <div className="w-32 sm:w-40">
                    {idx === 0 && (
                      <label className="block text-xs font-medium text-nox-lightgray mb-1.5">
                        Amount
                      </label>
                    )}
                    <input
                      type="number"
                      value={recipient.amount}
                      onChange={(e) => updateBatchRecipient(recipient.id, 'amount', e.target.value)}
                      placeholder="0.00"
                      className="nox-input font-mono text-sm py-2.5"
                      min="0"
                    />
                  </div>
                  <button
                    onClick={() => removeBatchRecipient(recipient.id)}
                    className="p-2.5 text-nox-lightgray hover:text-red-400 transition-colors cursor-pointer"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>

            <button
              onClick={addBatchRecipient}
              className="flex items-center gap-2 text-sm text-nox-gold hover:text-nox-deepgold transition-colors mb-6 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Recipient
            </button>

            <div className="flex items-center justify-between p-3 rounded-xl bg-nox-dark/50 border border-nox-border/50 mb-4">
              <span className="text-sm text-nox-lightgray">
                Total ({batchRecipients.filter(r => r.amount).length} recipients)
              </span>
              <span className="font-mono font-bold text-nox-gold">
                ${batchTotal} {symbol}
              </span>
            </div>

            <button
              onClick={handleSendBatch}
              disabled={isPending || !treasuryReadyForPayouts}
              className="btn-gold w-full flex items-center justify-center gap-2 py-3.5"
            >
              {isPending ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
              ) : (
                <><UsersIcon className="w-5 h-5" /> Send Batch Rewards</>
              )}
            </button>
          </motion.div>
        )}

        {/* Vesting */}
        {mode === 'vesting' && (
          <motion.div
            key="vesting"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="glass-card p-6 sm:p-8 max-w-2xl"
          >
            <h3 className="text-lg font-semibold text-white mb-1">
              Create Vesting Schedule
            </h3>
            <p className="text-sm text-nox-lightgray mb-6">
              Set up linear vesting with confidential balances
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-nox-lightgray mb-2">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={vestingAddr}
                  onChange={(e) => setVestingAddr(e.target.value)}
                  placeholder="0x..."
                  className="nox-input font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-nox-lightgray mb-2">
                    Total Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={vestingAmount}
                      onChange={(e) => setVestingAmount(e.target.value)}
                      placeholder="0.00"
                      className="nox-input pr-16 font-mono"
                      min="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-nox-lightgray text-xs">
                      {symbol}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap mt-3">
                    {['100', '500', '1000', '5000'].map((value) => (
                      <button
                        key={value}
                        onClick={() => setVestingAmount(value)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-nox-lightgray border border-nox-border hover:border-nox-gold hover:text-nox-gold transition-all cursor-pointer"
                      >
                        {Number(value).toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-nox-lightgray mb-2">
                    Vesting Duration
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={vestingDays}
                      onChange={(e) => setVestingDays(e.target.value)}
                      className="nox-input pr-14 font-mono"
                      min="1"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-nox-lightgray text-xs">
                      Days
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap mt-3">
                    {['30', '90', '180', '365'].map((value) => (
                      <button
                        key={value}
                        onClick={() => setVestingDays(value)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-nox-lightgray border border-nox-border hover:border-nox-gold hover:text-nox-gold transition-all cursor-pointer"
                      >
                        {value}d
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Vesting preview */}
              {vestingAmount && vestingDays && (
                <div className="p-4 rounded-xl bg-nox-dark/50 border border-nox-border/50">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarDays className="w-4 h-4 text-nox-gold" />
                    <span className="text-sm font-medium text-white">Vesting Preview</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-nox-lightgray">Daily Release</span>
                      <p className="font-mono text-nox-gold">
                        ${(parseFloat(vestingAmount) / parseInt(vestingDays)).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-nox-lightgray">Total Duration</span>
                      <p className="font-mono text-white">{vestingDays} days</p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-2 rounded-full bg-nox-dark overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '33%' }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="h-full rounded-full bg-gradient-to-r from-nox-gold to-nox-deepgold"
                    />
                  </div>
                  <p className="text-xs text-nox-lightgray mt-1">~33% vested preview</p>
                </div>
              )}

              <button
                onClick={handleCreateVesting}
                disabled={isPending || !treasuryReadyForPayouts}
                className="btn-gold w-full flex items-center justify-center gap-2 py-3.5"
              >
                {isPending ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</>
                ) : (
                  <><Clock className="w-5 h-5" /> Create Vesting Schedule</>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function TabButton({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
        active
          ? 'bg-nox-gold/10 text-nox-gold border border-nox-gold/30'
          : 'text-nox-lightgray hover:text-white hover:bg-white/5 border border-transparent'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function getTreasuryErrorDetails(error: unknown, mode: 'single' | 'batch' | 'vesting', symbol: string) {
  const rawMessage = extractTreasuryRawError(error);
  const lower = rawMessage.toLowerCase();
  const modeLabel = mode === 'single' ? 'reward' : mode === 'batch' ? 'batch payout' : 'vesting setup';

  if (!rawMessage) {
    return {
      title: `${capitalizeMode(mode)} needs another try`,
      message: `The ${modeLabel} did not complete. Check the wallet prompt and try again.`,
      steps: [
        'Keep the wallet connected on Arbitrum Sepolia.',
        'Retry the action after confirming the treasury is still ready.',
      ],
    };
  }
  if (lower.includes('user rejected')) {
    return {
      title: `${capitalizeMode(mode)} was cancelled`,
      message: `The ${modeLabel} was cancelled in the wallet before it could be submitted.`,
      steps: [
        'Open the wallet prompt again and approve the transaction if you still want to continue.',
        'Do not switch chain or account until the transaction is fully signed.',
      ],
    };
  }
  if (lower.includes('insufficient') && lower.includes('fund')) {
    return {
      title: 'Treasury wallet needs gas',
      message: 'The treasury wallet does not have enough Arbitrum Sepolia ETH to pay gas.',
      steps: [
        'Fund the treasury wallet with Sepolia ETH.',
        `Then retry the ${modeLabel} for the same ${symbol} amount.`,
      ],
    };
  }
  if (lower.includes('max fee per gas less than block base fee')) {
    return {
      title: 'Gas estimate went stale',
      message: `The ${modeLabel} failed because the wallet used an outdated gas estimate.`,
      steps: [
        'Retry the transaction so the wallet can fetch a fresh gas estimate.',
        'If your wallet exposes gas controls, approve with a slightly higher max fee.',
      ],
    };
  }
  if (lower.includes('rpc endpoint returned too many errors') || lower.includes('different rpc endpoint')) {
    return {
      title: 'RPC endpoint is overloaded',
      message: `The ${modeLabel} could not get a healthy response from the current Arbitrum Sepolia RPC.`,
      steps: [
        'Wait a little and retry once the network is calmer.',
        'If it keeps failing, switch the wallet or app to a healthier Arbitrum Sepolia RPC.',
      ],
    };
  }
  if (lower.includes('operator') || lower.includes('not approved')) {
    return {
      title: 'Treasury operator setup is missing',
      message: `The ${modeLabel} cannot move confidential funds until operator approval is active.`,
      steps: [
        `Call setOperator(${CONTRACTS.NOXPAY}, <future-unix-timestamp>) on the confidential token contract.`,
        'Then come back and retry the treasury action.',
      ],
    };
  }

  const cleaned = cleanTreasuryErrorMessage(rawMessage);
  return {
    title: `${capitalizeMode(mode)} needs another try`,
    message: cleaned.length > 0 && cleaned.length <= 220
      ? cleaned
      : `The ${modeLabel} failed. Open the browser console for the full revert reason.`,
    steps: [
      'Confirm the treasury wallet, chain, and operator approval are still correct.',
      'Retry once, then inspect the browser console if the same contract error returns.',
    ],
  };
}

function extractTreasuryRawError(error: unknown) {
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

function cleanTreasuryErrorMessage(message: string) {
  return message
    .replace(/^execution reverted:?\s*/i, '')
    .replace(/^reverted with reason string\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

function capitalizeMode(mode: 'single' | 'batch' | 'vesting') {
  switch (mode) {
    case 'single':
      return 'Reward';
    case 'batch':
      return 'Batch payout';
    case 'vesting':
      return 'Vesting setup';
  }
}
