import './style.css';
import { startApp } from './app';

const version = import.meta.env.VITE_APP_VERSION;
const host = document.querySelector<HTMLElement>('#app')!;

const app = startApp(host, version);

// Release renderer, audio and listeners when the document goes away.
globalThis.addEventListener('pagehide', () => void app.dispose(), { once: true });
