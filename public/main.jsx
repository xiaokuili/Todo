import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './js/App.jsx';
import './index.css';

// 加载时间选择器样式
if (!document.getElementById('swiss-time-picker-styles')) {
  const style = document.createElement('style');
  style.id = 'swiss-time-picker-styles';
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap');
    
    .swiss-time-picker {
      font-family: 'Inter', -apple-system, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    
    .swiss-mono {
      font-family: 'JetBrains Mono', monospace;
    }
    
    .swiss-minimal-bar {
      background: #ffffff;
      box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.05);
      border: 1px solid #f0f0f0;
      width: fit-content;
    }
    
    .swiss-time-group {
      transition: background-color 0.2s;
    }
    
    .swiss-time-group:focus-within {
      background: #fcfcfc;
    }
    
    .swiss-time-input {
      -webkit-appearance: none;
      -moz-appearance: textfield;
    }
    
    .swiss-time-input::-webkit-outer-spin-button,
    .swiss-time-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  `;
  document.head.appendChild(style);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

