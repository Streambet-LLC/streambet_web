import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import '@solana/wallet-adapter-react-ui/styles.css';
import { initGoogleAnalytics, initHotjar } from './lib/analytics';
import { initMixpanel } from './lib/mixpanel';

initGoogleAnalytics();
initHotjar();
initMixpanel();

createRoot(document.getElementById('root')!).render(<App />);
