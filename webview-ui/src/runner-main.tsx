import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { RunnerApp } from './RunnerApp';
import './styles/runner.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RunnerApp />
  </StrictMode>
);
