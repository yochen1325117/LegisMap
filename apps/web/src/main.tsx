import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'taiwan-atlas/dist/taiwan-atlas.css';
import './styles.css';
import { App } from './App.tsx';

const base = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={base}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
