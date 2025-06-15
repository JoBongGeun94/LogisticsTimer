import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// 전역 에러 핸들러 설정
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

try {
  const root = ReactDOM.createRoot(rootElement);
  
  // 에러 경계 컴포넌트
  const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
    const [hasError, setHasError] = React.useState(false);
    
    React.useEffect(() => {
      if (hasError) {
        // 5초 후 자동 재시도
        const timer = setTimeout(() => {
          setHasError(false);
          window.location.reload();
        }, 5000);
        return () => clearTimeout(timer);
      }
    }, [hasError]);

    if (hasError) {
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh', 
          fontFamily: 'sans-serif',
          backgroundColor: '#f3f4f6',
          color: '#374151'
        }}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <h1 style={{ marginBottom: '16px' }}>앱 로딩 중 오류가 발생했습니다</h1>
            <p style={{ marginBottom: '20px' }}>5초 후 자동으로 재시도됩니다.</p>
            <button 
              onClick={() => window.location.reload()}
              style={{ 
                padding: '10px 20px', 
                backgroundColor: '#3b82f6', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              지금 새로고침
            </button>
          </div>
        </div>
      );
    }

    try {
      return <>{children}</>;
    } catch (error) {
      console.error('Render error:', error);
      setHasError(true);
      return null;
    }
  };
  
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  rootElement.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; background-color: #f3f4f6;">
      <div style="text-align: center; padding: 20px;">
        <h1 style="color: #dc2626; margin-bottom: 16px;">앱 초기화 실패</h1>
        <p style="color: #374151; margin-bottom: 20px;">브라우저 호환성 문제이거나 JavaScript가 비활성화되어 있을 수 있습니다.</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background-color: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">새로고침</button>
      </div>
    </div>
  `;
}