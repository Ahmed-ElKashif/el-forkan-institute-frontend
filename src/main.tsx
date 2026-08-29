import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { createContainer } from './shared/di/container';
import './styles/index.css';

/* The program's edge: read configuration, build the object graph once, hand it
   to React. `VITE_API_BASE_URL` lives in `.env`; the default matches the API's
   own PORT=3000, whose CORS_ORIGIN already allows this dev server. */
const container = createContainer({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App container={container} />
  </StrictMode>,
);
