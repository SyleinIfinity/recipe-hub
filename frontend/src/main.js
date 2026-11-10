import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './style.css';
import { ErrorBoundary } from './components/ErrorBoundary.js';

createRoot(document.getElementById('root')).render(
  createElement(ErrorBoundary, null, createElement(App)),
);
