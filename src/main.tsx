import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Silently register Workbox service worker for zero-install offline app shell caching
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(<App />);
