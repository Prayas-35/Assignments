import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app';
import '@rainbow-me/rainbowkit/styles.css';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@mui/material/styles/styled';
import './assets/style.css';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ToastContainer } from 'react-toastify';
import { ThemeProvider } from '@mui/material';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygonAmoy } from 'wagmi/chains';
import { theme } from './theme/index.ts';
import { persistor, store } from './store';

const walletConnectProjectId = import.meta.env.VITE_WC_PROJECT_ID || '';
const wagmiConfig = getDefaultConfig({
  appName: 'Student Management System',
  projectId: walletConnectProjectId || 'MISSING_PROJECT_ID',
  chains: [polygonAmoy],
  ssr: false
});
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
              <ThemeProvider theme={theme}>
                <App />
              </ThemeProvider>
              <ToastContainer />
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
