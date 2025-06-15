import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  // 에러 발생 시 기본 UI 표시
  rootElement.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
      <div style="text-align: center;">
        <h1>앱 로딩 중 오류가 발생했습니다</h1>
        <p>페이지를 새로고침해주세요.</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; margin-top: 10px;">새로고침</button>
      </div>
    </div>
  `;
}