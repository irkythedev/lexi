import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/sora';
import App from './App.tsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
