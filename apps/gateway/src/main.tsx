import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from '@/App';
import { QueryProvider } from '@/providers/QueryProvider';
import { SolanaProviders } from '@/providers/SolanaProviders';
import '@/styles/globals.css';

const root_element = document.getElementById('root');

if (!root_element) {
  throw new Error('Root element not found');
}

createRoot(root_element).render(
  <StrictMode>
    <QueryProvider>
      <SolanaProviders>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SolanaProviders>
    </QueryProvider>
  </StrictMode>,
);
