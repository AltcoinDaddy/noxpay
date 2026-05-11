import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock3,
  ExternalLink,
  Layers3,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { decodeEventLog, formatUnits } from 'viem';
import { useAccount, usePublicClient } from 'wagmi';
import { CONTRACTS, NOXPAY_ABI, ZERO_ADDRESS } from '../config/contracts';
import { useTokenMetadata } from '../hooks/useTokenMetadata';

type TreasuryPayoutItem = {
  id: string;
  kind: 'reward' | 'batch' | 'vesting';
  title: string;
  description: string;
  timestamp: number;
  txHash: string;
};

const LOOKBACK_BLOCKS = 120_000n;

function shortenHash(value: string) {
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function shortenAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function itemIcon(kind: TreasuryPayoutItem['kind']) {
  switch (kind) {
    case 'reward':
      return <Send className="w-4 h-4 text-nox-gold" />;
    case 'batch':
      return <Users className="w-4 h-4 text-nox-cyan" />;
    case 'vesting':
      return <ShieldCheck className="w-4 h-4 text-nox-success" />;
  }
}

export function TreasuryPayoutHistory() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { decimals, symbol } = useTokenMetadata();
  const [items, setItems] = useState<TreasuryPayoutItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPayoutHistory() {
      if (!address || !publicClient || CONTRACTS.NOXPAY === ZERO_ADDRESS) {
        if (!cancelled) {
          setItems([]);
        }
        return;
      }

      setIsLoading(true);

      try {
        const latestBlock = await publicClient.getBlockNumber();
        const fromBlock = latestBlock > LOOKBACK_BLOCKS ? latestBlock - LOOKBACK_BLOCKS : 0n;
        const logs = await publicClient.getLogs({
          address: CONTRACTS.NOXPAY as `0x${string}`,
          fromBlock,
          toBlock: latestBlock,
        });

        const blockNumbers = new Set<bigint>();
        for (const log of logs) {
          if (typeof log.blockNumber === 'bigint') {
            blockNumbers.add(log.blockNumber);
          }
        }

        const blockTimestampMap = new Map<bigint, number>();
        await Promise.all(
          Array.from(blockNumbers).map(async (blockNumber) => {
            const block = await publicClient.getBlock({ blockNumber });
            blockTimestampMap.set(blockNumber, Number(block.timestamp));
          })
        );

        const nextItems: TreasuryPayoutItem[] = [];
        const normalizedAddress = address.toLowerCase();

        for (const log of logs) {
          try {
            const decoded = decodeEventLog({
              abi: NOXPAY_ABI,
              data: log.data,
              topics: log.topics,
            });

            const fallbackTimestamp = typeof log.blockNumber === 'bigint'
              ? blockTimestampMap.get(log.blockNumber) ?? 0
              : 0;

            if (decoded.eventName === 'RewardSent') {
              const args = decoded.args as {
                from: string;
                to: string;
                publicAggregate: bigint;
                timestamp: bigint;
              };
              if (args.from.toLowerCase() !== normalizedAddress) {
                continue;
              }
              nextItems.push({
                id: `${log.transactionHash}-reward`,
                kind: 'reward',
                title: 'Single confidential reward',
                description: `Sent to ${shortenAddress(args.to)}. Public aggregate now ${Number(
                  formatUnits(args.publicAggregate, decimals)
                ).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} ${symbol}.`,
                timestamp: Number(args.timestamp || BigInt(fallbackTimestamp)),
                txHash: log.transactionHash,
              });
            }

            if (decoded.eventName === 'BatchPaymentExecuted') {
              const args = decoded.args as {
                treasury: string;
                recipientCount: bigint;
                totalPublicAmount: bigint;
                timestamp: bigint;
              };
              if (args.treasury.toLowerCase() !== normalizedAddress) {
                continue;
              }
              nextItems.push({
                id: `${log.transactionHash}-batch`,
                kind: 'batch',
                title: 'Batch payout executed',
                description: `${Number(args.recipientCount)} recipients, ${Number(
                  formatUnits(args.totalPublicAmount, decimals)
                ).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} ${symbol} in public total.`,
                timestamp: Number(args.timestamp || BigInt(fallbackTimestamp)),
                txHash: log.transactionHash,
              });
            }

            if (decoded.eventName === 'VestingScheduleCreated') {
              const args = decoded.args as {
                recipient: string;
                scheduleId: bigint;
                totalAmount: bigint;
                duration: bigint;
                startTime: bigint;
              };
              nextItems.push({
                id: `${log.transactionHash}-vesting-${args.scheduleId.toString()}`,
                kind: 'vesting',
                title: 'Vesting schedule created',
                description: `${Number(formatUnits(args.totalAmount, decimals)).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} ${symbol} for ${shortenAddress(args.recipient)} over ${Math.round(Number(args.duration) / 86400)} days.`,
                timestamp: Number(args.startTime || BigInt(fallbackTimestamp)),
                txHash: log.transactionHash,
              });
            }
          } catch {
            continue;
          }
        }

        nextItems.sort((left, right) => right.timestamp - left.timestamp);

        if (!cancelled) {
          setItems(nextItems.slice(0, 8));
        }
      } catch {
        if (!cancelled) {
          setItems([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPayoutHistory();

    return () => {
      cancelled = true;
    };
  }, [address, decimals, publicClient, symbol]);

  const summary = useMemo(() => {
    return {
      rewards: items.filter((item) => item.kind === 'reward').length,
      batches: items.filter((item) => item.kind === 'batch').length,
      vesting: items.filter((item) => item.kind === 'vesting').length,
    };
  }, [items]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.22 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nox-gold/20 to-nox-success/10 flex items-center justify-center">
          <Layers3 className="w-5 h-5 text-nox-gold" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Treasury Payout History
          </h2>
          <p className="text-xs text-nox-lightgray">
            Focused record of outgoing treasury rewards, batch payouts, and vesting setups
          </p>
        </div>
      </div>

      <div className="glass-card p-6 max-w-3xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <SummaryCard label="Single rewards" value={summary.rewards.toString()} />
          <SummaryCard label="Batch payouts" value={summary.batches.toString()} />
          <SummaryCard label="Vesting setups" value={summary.vesting.toString()} />
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 text-sm text-nox-lightgray">
            <Clock3 className="w-4 h-4 animate-pulse text-nox-gold" />
            Loading treasury payout history...
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-nox-lightgray">
            No treasury payout history found in the latest Sepolia history window.
          </p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-nox-border/40 bg-nox-dark/30 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3 min-w-0">
                    <div className="mt-0.5 w-9 h-9 rounded-xl bg-white/5 border border-nox-border/40 flex items-center justify-center shrink-0">
                      {itemIcon(item.kind)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {item.title}
                      </p>
                      <p className="text-sm text-nox-lightgray mt-1">
                        {item.description}
                      </p>
                      <p className="text-xs text-nox-lightgray mt-2">
                        {formatTimestamp(item.timestamp)}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`https://sepolia.arbiscan.io/tx/${item.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 text-xs text-nox-gold hover:text-nox-deepgold transition-colors"
                  >
                    {shortenHash(item.txHash)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-nox-border/40 bg-nox-dark/30 px-4 py-3">
      <p className="text-xs text-nox-lightgray mb-1">{label}</p>
      <p className="text-lg font-mono text-white">{value}</p>
    </div>
  );
}
