import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrumSepolia } from 'wagmi/chains';

/**
 * Wagmi + RainbowKit configuration for NoxPay
 * Network: Arbitrum Sepolia (testnet)
 */
export const config = getDefaultConfig({
  appName: 'NoxPay',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'noxpay-dev-placeholder',
  chains: [arbitrumSepolia],
  ssr: false,
});
