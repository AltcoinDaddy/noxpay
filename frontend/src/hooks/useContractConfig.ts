import { useAccount } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';

/**
 * Returns the common fields required by wagmi v3's writeContract:
 * `chain` and `account`. Every writeContract() call must include these.
 */
export function useContractConfig() {
  const { address } = useAccount();
  return {
    chain: arbitrumSepolia,
    account: address,
  } as const;
}
