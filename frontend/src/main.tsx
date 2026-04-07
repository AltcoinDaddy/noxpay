import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { config } from './config/wagmi';
import App from './App';
import '@rainbow-me/rainbowkit/styles.css';
import './index.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#F2B84B',
            accentColorForeground: '#0A0F1C',
            borderRadius: 'medium',
            fontStack: 'system',
          })}
        >
          <App />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#1C2333',
                color: '#ffffff',
                border: '1px solid #2A3349',
                borderRadius: '12px',
                fontFamily: 'Inter, sans-serif',
              },
              success: {
                iconTheme: { primary: '#22C55E', secondary: '#0A0F1C' },
              },
              error: {
                iconTheme: { primary: '#EF4444', secondary: '#0A0F1C' },
              },
            }}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
