import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConnectKitProvider } from 'connectkit'
import { wagmiConfig } from './lib/wagmi'
import App from './App'
import './styles/globals.css'

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
            '--ck-accent-color': '#ff5a2b',
            '--ck-accent-text-color': '#0a0a0b',
            '--ck-modal-background': '#111114',
            '--ck-body-background': '#111114',
            '--ck-body-background-secondary': '#16161a',
            '--ck-body-color': '#f2f2f3',
            '--ck-body-color-muted': '#b8b8be',
            '--ck-primary-button-background': '#111114',
            '--ck-primary-button-border-radius': '0px',
            '--ck-secondary-button-background': '#16161a',
            '--ck-secondary-button-border-radius': '0px',
            '--ck-tertiary-button-background': '#16161a',
          }}
        >
          <App />
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
)
