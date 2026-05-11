import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider } from 'connectkit'
import { wagmiConfig } from './lib/wagmi'
import App from './App'
import './styles/globals.css'
import './styles/brutalist.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 12_000,
      refetchInterval: 12_000,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          theme="midnight"
          customTheme={{
            '--ck-font-family': "'JetBrains Mono', ui-monospace, monospace",
            '--ck-border-radius': '0px',
            '--ck-accent-color': '#00ff85',
            '--ck-accent-text-color': '#000000',
            '--ck-modal-background': '#050505',
            '--ck-body-background': '#050505',
            '--ck-body-background-secondary': '#0a0a0a',
            '--ck-body-color': '#ffffff',
            '--ck-body-color-muted': '#888888',
            '--ck-primary-button-background': '#0a0a0a',
            '--ck-primary-button-border-radius': '0px',
            '--ck-secondary-button-background': '#111111',
            '--ck-secondary-button-border-radius': '0px',
            '--ck-tertiary-button-background': '#111111',
          }}
        >
          <App />
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
)
