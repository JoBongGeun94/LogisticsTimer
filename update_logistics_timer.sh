#!/bin/bash

# LogisticsTimer 통합 업데이트 스크립트
# 기존 레포지토리 구조를 유지하며 새로운 기능들을 완전히 적용

set -e  # 에러 발생시 스크립트 중단

echo "🚀 LogisticsTimer 통합 업데이트를 시작합니다..."

# 현재 디렉토리가 LogisticsTimer 프로젝트인지 확인
if [ ! -f "package.json" ]; then
    echo "❌ 오류: package.json 파일이 없습니다. LogisticsTimer 프로젝트 디렉토리에서 실행해주세요."
    exit 1
fi

echo "📂 현재 위치: $(pwd)"

# 백업 생성
echo "💾 기존 파일 백업 생성 중..."
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r src "$BACKUP_DIR/" 2>/dev/null || echo "⚠️  src 디렉토리가 없습니다."
cp package.json "$BACKUP_DIR/" 2>/dev/null || true
cp package-lock.json "$BACKUP_DIR/" 2>/dev/null || true
echo "✅ 백업 완료: $BACKUP_DIR"

# package.json 업데이트 - 필요한 의존성 확인 및 설치
echo "📦 의존성 패키지 확인 및 설치..."

# React 및 TypeScript 의존성 확인
if ! npm list react &>/dev/null; then
    echo "📦 React 설치 중..."
    npm install react@^18.0.0 react-dom@^18.0.0
fi

if ! npm list typescript &>/dev/null; then
    echo "📦 TypeScript 설치 중..."
    npm install -D typescript @types/react @types/react-dom @types/node
fi

# Tailwind CSS 설치 및 설정
if ! npm list tailwindcss &>/dev/null; then
    echo "🎨 Tailwind CSS 설치 중..."
    npm install -D tailwindcss postcss autoprefixer
    npx tailwindcss init -p
fi

# Lucide React 아이콘 설치
if ! npm list lucide-react &>/dev/null; then
    echo "🎯 Lucide React 아이콘 설치 중..."
    npm install lucide-react
fi

# 빌드 도구 확인 (Vite 우선, 없으면 Create React App)
if [ ! -f "vite.config.ts" ] && [ ! -f "vite.config.js" ] && [ ! -f "craco.config.js" ]; then
    if ! npm list vite &>/dev/null; then
        echo "⚡ Vite 설치 중..."
        npm install -D vite @vitejs/plugin-react
    fi
fi

echo "✅ 의존성 설치 완료"

# src 디렉토리 생성 (없는 경우)
mkdir -p src

# 공용 디렉토리 및 이미지 처리
echo "🖼️  공용 자산 설정 중..."
mkdir -p public

# 공군 종합보급창 로고 이미지 생성 (Base64 인코딩된 간단한 로고)
if [ ! -f "public/logo-rokaf-supply.png" ]; then
    echo "🏷️  기본 로고 이미지 생성 중..."
    # 기본 로고 이미지가 없는 경우를 대비한 처리
    cat > "public/logo-rokaf-supply.svg" << 'EOF'
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="90" fill="#1e40af" stroke="#ffffff" stroke-width="4"/>
  <text x="100" y="85" text-anchor="middle" fill="white" font-size="16" font-weight="bold">공군</text>
  <text x="100" y="105" text-anchor="middle" fill="white" font-size="12">종합보급창</text>
  <text x="100" y="125" text-anchor="middle" fill="white" font-size="10">LogisticsTimer</text>
</svg>
EOF
fi

# Tailwind CSS 설정 파일 생성/업데이트
echo "🎨 Tailwind CSS 설정 중..."
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 3s infinite',
        'in': 'fadeIn 0.3s ease-in-out',
        'slide-in-from-right': 'slideInFromRight 0.3s ease-out',
        'slide-in-from-bottom': 'slideInFromBottom 0.3s ease-out',
        'slide-in-from-top': 'slideInFromTop 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInFromRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInFromBottom: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInFromTop: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
EOF

# CSS 파일 생성/업데이트
echo "🎨 CSS 파일 설정 중..."
cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 기본 스타일 설정 */
* {
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 모바일 최적화 */
@media (max-width: 768px) {
  body {
    font-size: 14px;
  }
}

/* 다크모드 지원 */
.dark {
  color-scheme: dark;
}

/* 스크롤바 스타일링 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.dark ::-webkit-scrollbar-thumb {
  background-color: rgba(75, 85, 99, 0.5);
}

/* 애니메이션 클래스 */
.animate-in {
  animation-fill-mode: both;
}

.slide-in-from-right {
  animation: slideInFromRight 0.3s ease-out;
}

.slide-in-from-bottom {
  animation: slideInFromBottom 0.3s ease-out;
}

.slide-in-from-top {
  animation: slideInFromTop 0.2s ease-out;
}

/* 유틸리티 클래스 */
.line-clamp-1 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
}

.break-all {
  word-break: break-all;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 포커스 스타일 */
button:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* 터치 디바이스 최적화 */
@media (hover: none) and (pointer: coarse) {
  button {
    min-height: 44px;
  }
}
EOF

# TypeScript 설정 파일 생성/업데이트
echo "⚙️  TypeScript 설정 중..."
if [ ! -f "tsconfig.json" ]; then
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF
fi

# Vite 설정 파일 생성 (없는 경우)
if [ ! -f "vite.config.ts" ] && [ ! -f "vite.config.js" ]; then
echo "⚡ Vite 설정 파일 생성 중..."
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          lucide: ['lucide-react']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react']
  }
})
EOF
fi

# main.tsx 또는 index.tsx 파일 생성/업데이트
echo "🔧 Entry 파일 설정 중..."
if [ ! -f "src/main.tsx" ] && [ ! -f "src/index.tsx" ]; then
cat > src/main.tsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF
fi

# index.html 파일 생성/업데이트
echo "📄 HTML 템플릿 설정 중..."
if [ ! -f "index.html" ]; then
cat > index.html << 'EOF'
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/logo-rokaf-supply.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="공군 종합보급창 물류 작업현장 인시수 측정 타이머" />
    <meta name="keywords" content="물류, 인시수, 측정, 타이머, 공군, 종합보급창" />
    <meta name="author" content="공군 종합보급창" />
    <title>물류 인시수 측정 타이머 | 공군 종합보급창</title>
    
    <!-- PWA 관련 메타태그 -->
    <meta name="theme-color" content="#1e40af" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="물류 타이머" />
    
    <!-- 모바일 최적화 -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="format-detection" content="telephone=no" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF
fi

# 메인 App.tsx 파일 교체
echo "🔄 App.tsx 파일 업데이트 중..."
cat > src/App.tsx << 'EOF'
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  Play, Pause, Square, RotateCcw, Download, Plus, Users,
  Package, Clock, BarChart3, FileText, Calculator,
  Zap, Target, Home, HelpCircle, RefreshCw, LogOut,
  Moon, Sun, TrendingUp, PieChart, Info, CheckCircle,
  AlertCircle, XCircle, Timer, Activity, Settings,
  Trash2, Filter, Search, X, Minus, ArrowLeft,
  TrendingUp as TrendingUpIcon, AlertTriangle, Share2
} from 'lucide-react';

// ==================== 타입 정의 (Single Responsibility) ====================
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  isVisible: boolean;
  onClose: () => void;
}

interface LapTime {
  id: number;
  time: number;
  timestamp: string;
  operator: string;
  target: string;
  sessionId: string;
}

interface SessionData {
  id: string;
  name: string;
  workType: string;
  operators: string[];
  targets: string[];
  lapTimes: LapTime[];
  startTime: string;
  endTime?: string;
  isActive: boolean;
}

interface GageRRAnalysis {
  repeatability: number;
  reproducibility: number;
  gageRR: number;
  partVariation: number;
  totalVariation: number;
  gageRRPercent: number;
  ndc: number;
  status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable';
  cpk: number;
  anova: {
    operator: number;
    part: number;
    interaction: number;
    error: number;
    total: number;
    operatorPercent: number;
    partPercent: number;
    interactionPercent: number;
    errorPercent: number;
  };
  interpretation: {
    overall: string;
    repeatability: string;
    reproducibility: string;
    recommendations: string[];
    riskLevel: 'low' | 'medium' | 'high';
  };
}

interface Theme {
  bg: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  input: string;
  surface: string;
  surfaceHover: string;
}

// ==================== 상수 및 테마 (Open/Closed Principle) ====================
const THEME_COLORS = {
  light: {
    bg: 'bg-gray-50',
    card: 'bg-white',
    text: 'text-gray-900',
    textSecondary: 'text-gray-700',
    textMuted: 'text-gray-500',
    border: 'border-gray-200',
    accent: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    input: 'bg-white border-gray-300 text-gray-900 placeholder-gray-400',
    surface: 'bg-gray-50',
    surfaceHover: 'hover:bg-gray-100'
  },
  dark: {
    bg: 'bg-gray-900',
    card: 'bg-gray-800',
    text: 'text-white',
    textSecondary: 'text-gray-200',
    textMuted: 'text-gray-400',
    border: 'border-gray-600',
    accent: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600',
    input: 'bg-gray-700 border-gray-600 text-white placeholder-gray-400',
    surface: 'bg-gray-700',
    surfaceHover: 'hover:bg-gray-600'
  }
} as const;

const STATUS_COLORS = {
  excellent: {
    light: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', icon: 'text-green-600' },
    dark: { bg: 'bg-green-900/30', text: 'text-green-300', border: 'border-green-700', icon: 'text-green-400' }
  },
  acceptable: {
    light: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', icon: 'text-blue-600' },
    dark: { bg: 'bg-blue-900/30', text: 'text-blue-300', border: 'border-blue-700', icon: 'text-blue-400' }
  },
  marginal: {
    light: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200', icon: 'text-yellow-600' },
    dark: { bg: 'bg-yellow-900/30', text: 'text-yellow-300', border: 'border-yellow-700', icon: 'text-yellow-400' }
  },
  unacceptable: {
    light: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', icon: 'text-red-600' },
    dark: { bg: 'bg-red-900/30', text: 'text-red-300', border: 'border-red-700', icon: 'text-red-400' }
  }
} as const;

// ==================== 유틸리티 함수 (Pure Functions) ====================
const formatTime = (ms: number): string => {
  if (ms < 0) return '00:00.00';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

const generateFileName = (prefix: string, sessionName: string): string => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  const timestamp = `${year}${month}${day}${hour}${minute}`;
  
  const safeName = sessionName.replace(/[^a-zA-Z0-9가-힣_-]/g, '_');
  return `${prefix}-${safeName}-(${timestamp}).csv`;
};

// CSV 생성 함수 (UTF-8 BOM 추가로 한글 깨짐 방지)
const createCSVContent = (data: (string | number)[][]): string => {
  const csvRows = data.map(row => 
    row.map(cell => {
      const cellStr = String(cell);
      // 쉼표, 줄바꿈, 따옴표가 포함된 경우 따옴표로 감싸기
      if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')
  );
  
  // UTF-8 BOM 추가
  return '\ufeff' + csvRows.join('\n');
};

// 모바일/PC 통합 다운로드 함수 (완전 수정)
const downloadCSVFile = (content: string, filename: string): boolean => {
  try {
    // CSV Blob 생성 (정확한 MIME 타입 사용)
    const blob = new Blob([content], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    // URL 생성
    const url = URL.createObjectURL(blob);
    
    // 다운로드 링크 생성
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    // DOM에 추가하고 클릭
    document.body.appendChild(link);
    link.click();
    
    // 정리
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    return true;
  } catch (error) {
    console.error('CSV download failed:', error);
    return false;
  }
};

// 뒤로가기 방지 훅
const useBackButtonPrevention = () => {
  const [backPressCount, setBackPressCount] = useState(0);
  const [showBackWarning, setShowBackWarning] = useState(false);
  
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      
      if (backPressCount === 0) {
        setBackPressCount(1);
        setShowBackWarning(true);
        window.history.pushState(null, '', window.location.href);
        
        setTimeout(() => {
          setBackPressCount(0);
          setShowBackWarning(false);
        }, 2000);
      } else {
        window.history.back();
      }
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [backPressCount]);

  return { showBackWarning };
};

// ==================== Gage R&R 분석 로직 ====================
const calculateGageRR = (lapTimes: LapTime[]): GageRRAnalysis => {
  const defaultResult: GageRRAnalysis = {
    repeatability: 0, reproducibility: 0, gageRR: 0,
    partVariation: 0, totalVariation: 0, gageRRPercent: 100,
    ndc: 0, status: 'unacceptable', cpk: 0,
    anova: {
      operator: 0, part: 0, interaction: 0, error: 0, total: 0,
      operatorPercent: 0, partPercent: 0, interactionPercent: 0, errorPercent: 0
    },
    interpretation: {
      overall: '분석을 위한 데이터가 부족합니다.',
      repeatability: '반복성 분석 불가',
      reproducibility: '재현성 분석 불가',
      recommendations: ['최소 6개 이상의 측정 데이터가 필요합니다.'],
      riskLevel: 'high'
    }
  };

  if (!lapTimes || lapTimes.length < 6) return defaultResult;

  try {
    const times = lapTimes.map(lap => lap.time).filter(time => time > 0);
    if (times.length < 6) return defaultResult;

    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((acc, time) => acc + Math.pow(time - mean, 2), 0) / Math.max(1, times.length - 1);
    const stdDev = Math.sqrt(variance);

    // 측정자별, 대상자별 그룹화
    const operatorGroups = lapTimes.reduce((groups, lap) => {
      const key = lap.operator?.trim();
      if (key && lap.time > 0) {
        if (!groups[key]) groups[key] = [];
        groups[key].push(lap.time);
      }
      return groups;
    }, {} as Record<string, number[]>);

    const targetGroups = lapTimes.reduce((groups, lap) => {
      const key = lap.target?.trim();
      if (key && lap.time > 0) {
        if (!groups[key]) groups[key] = [];
        groups[key].push(lap.time);
      }
      return groups;
    }, {} as Record<string, number[]>);

    const operatorCount = Object.keys(operatorGroups).length;
    const targetCount = Object.keys(targetGroups).length;

    if (operatorCount === 0 || targetCount === 0) return defaultResult;

    const trialsPerCondition = Math.max(1, Math.floor(times.length / (operatorCount * targetCount)));

    // 반복성 계산
    let repeatabilityVariance = 0;
    let totalWithinGroups = 0;

    Object.values(operatorGroups).forEach(group => {
      if (group.length > 1) {
        const groupMean = group.reduce((a, b) => a + b, 0) / group.length;
        repeatabilityVariance += group.reduce((acc, val) => acc + Math.pow(val - groupMean, 2), 0);
        totalWithinGroups += group.length - 1;
      }
    });

    const repeatability = totalWithinGroups > 0 
      ? Math.sqrt(repeatabilityVariance / totalWithinGroups)
      : stdDev * 0.8;

    // 재현성 계산
    const operatorMeans = Object.values(operatorGroups)
      .filter(group => group.length > 0)
      .map(group => group.reduce((a, b) => a + b, 0) / group.length);

    const operatorVariance = operatorMeans.length > 1
      ? operatorMeans.reduce((acc, opMean) => acc + Math.pow(opMean - mean, 2), 0) / Math.max(1, operatorCount - 1)
      : 0;

    const reproducibility = Math.sqrt(Math.max(0, operatorVariance - (repeatability * repeatability) / trialsPerCondition));

    // 대상자 변동 계산
    const targetMeans = Object.values(targetGroups)
      .filter(group => group.length > 0)
      .map(group => group.reduce((a, b) => a + b, 0) / group.length);

    const targetVariance = targetMeans.length > 1
      ? targetMeans.reduce((acc, targetMean) => acc + Math.pow(targetMean - mean, 2), 0) / Math.max(1, targetCount - 1)
      : variance;

    const partVariation = Math.sqrt(Math.max(0, targetVariance - (repeatability * repeatability) / trialsPerCondition));

    const gageRR = Math.sqrt(repeatability ** 2 + reproducibility ** 2);
    const totalVariation = Math.sqrt(gageRR ** 2 + partVariation ** 2);
    const gageRRPercent = totalVariation > 0 ? Math.min(100, (gageRR / totalVariation) * 100) : 100;
    const ndc = partVariation > 0 && gageRR > 0 ? Math.max(0, Math.floor((partVariation / gageRR) * 1.41)) : 0;

    // Cpk 계산
    const cpk = partVariation > 0 && stdDev > 0 ? Math.max(0, partVariation / (6 * stdDev)) : 0;

    // ANOVA 분석
    const totalANOVAVariance = operatorVariance + targetVariance + (variance * 0.1) + (repeatability ** 2);
    const anova = {
      operator: Math.max(0, operatorVariance),
      part: Math.max(0, targetVariance),
      interaction: Math.max(0, variance * 0.1),
      error: Math.max(0, repeatability ** 2),
      total: Math.max(0, totalANOVAVariance),
      operatorPercent: totalANOVAVariance > 0 ? (operatorVariance / totalANOVAVariance) * 100 : 0,
      partPercent: totalANOVAVariance > 0 ? (targetVariance / totalANOVAVariance) * 100 : 0,
      interactionPercent: totalANOVAVariance > 0 ? ((variance * 0.1) / totalANOVAVariance) * 100 : 0,
      errorPercent: totalANOVAVariance > 0 ? ((repeatability ** 2) / totalANOVAVariance) * 100 : 0
    };

    // 상태 결정
    let status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable';
    if (gageRRPercent < 10) status = 'excellent';
    else if (gageRRPercent < 30) status = 'acceptable';
    else if (gageRRPercent < 50) status = 'marginal';
    else status = 'unacceptable';

    // 해석 생성
    const interpretation = generateInterpretation(gageRRPercent, repeatability, reproducibility, cpk, ndc, anova);

    return {
      repeatability: Math.max(0, repeatability),
      reproducibility: Math.max(0, reproducibility),
      gageRR: Math.max(0, gageRR),
      partVariation: Math.max(0, partVariation),
      totalVariation: Math.max(0, totalVariation),
      gageRRPercent: Math.max(0, gageRRPercent),
      ndc: Math.max(0, ndc),
      status,
      cpk: Math.max(0, cpk),
      anova,
      interpretation
    };
  } catch (error) {
    console.error('calculateGageRR error:', error);
    return defaultResult;
  }
};

const generateInterpretation = (
  gageRRPercent: number, 
  repeatability: number, 
  reproducibility: number, 
  cpk: number, 
  ndc: number,
  anova: any
): GageRRAnalysis['interpretation'] => {
  const overall = gageRRPercent < 10 
    ? '측정 시스템이 우수합니다. 제품 변동을 정확하게 구별할 수 있으며, 측정 오차가 매우 낮습니다.'
    : gageRRPercent < 30
    ? '측정 시스템이 양호합니다. 대부분의 상황에서 사용 가능하나 지속적인 모니터링이 필요합니다.'
    : gageRRPercent < 50
    ? '측정 시스템이 보통 수준입니다. 제한적으로 사용 가능하나 개선이 권장됩니다.'
    : '측정 시스템에 심각한 문제가 있습니다. 즉시 개선이 필요하며, 현재 상태로는 신뢰할 수 없습니다.';

  const repeatabilityInterpretation = repeatability < reproducibility
    ? '반복성이 우수합니다. 동일한 측정자가 동일한 조건에서 측정할 때 일관된 결과를 얻을 수 있습니다.'
    : '반복성에 문제가 있습니다. 장비의 정밀도나 측정 환경을 점검해야 합니다.';

  const reproducibilityInterpretation = reproducibility < repeatability
    ? '재현성이 우수합니다. 서로 다른 측정자가 측정해도 일관된 결과를 얻을 수 있습니다.'
    : '재현성에 문제가 있습니다. 측정자 간 교육이나 표준 절차 개선이 필요합니다.';

  const recommendations: string[] = [];
  
  if (gageRRPercent >= 30) {
    recommendations.push('측정 시스템 전반적인 재검토 필요');
    recommendations.push('측정 장비의 교정 및 정밀도 점검');
  }
  
  if (repeatability > reproducibility) {
    recommendations.push('측정 장비의 안정성 및 정밀도 개선');
    recommendations.push('측정 환경 조건 표준화');
  } else {
    recommendations.push('측정자 교육 프로그램 강화');
    recommendations.push('표준 작업 절차서 개선');
  }

  if (cpk < 1.33) {
    recommendations.push('공정 능력 개선 필요');
  }

  if (ndc < 5) {
    recommendations.push('측정 시스템의 구별 능력 향상 필요');
  }

  if (anova.operatorPercent > 30) {
    recommendations.push('측정자 간 변동 감소를 위한 교육 강화');
  }

  const riskLevel: 'low' | 'medium' | 'high' = 
    gageRRPercent < 10 ? 'low' : 
    gageRRPercent < 30 ? 'medium' : 'high';

  return {
    overall,
    repeatability: repeatabilityInterpretation,
    reproducibility: reproducibilityInterpretation,
    recommendations,
    riskLevel
  };
};

// ==================== UI 컴포넌트들 (Single Responsibility) ====================

// 토스트 컴포넌트
const Toast = memo<ToastProps>(({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const typeConfig = {
    success: { style: 'bg-green-500 text-white', icon: CheckCircle },
    error: { style: 'bg-red-500 text-white', icon: XCircle },
    warning: { style: 'bg-yellow-500 text-white', icon: AlertCircle },
    info: { style: 'bg-blue-500 text-white', icon: Info }
  };

  const { style, icon: Icon } = typeConfig[type];

  return (
    <div className="fixed top-4 right-4 z-[60] animate-in slide-in-from-right duration-300">
      <div className={`${style} px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

// 뒤로가기 경고 컴포넌트
const BackWarning = memo<{ isVisible: boolean }>(({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[70] animate-in slide-in-from-bottom duration-300">
      <div className="bg-yellow-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">한 번 더 뒤로가기 하면 종료됩니다</span>
      </div>
    </div>
  );
});

// 상태 배지 컴포넌트
const StatusBadge = memo<{ 
  status: 'excellent' | 'acceptable' | 'marginal' | 'unacceptable'; 
  size?: 'sm' | 'md' | 'lg';
  isDark: boolean;
}>(({ status, size = 'md', isDark }) => {
  const config = useMemo(() => {
    const statusMap = {
      excellent: { icon: CheckCircle, text: '우수' },
      acceptable: { icon: CheckCircle, text: '양호' },
      marginal: { icon: AlertCircle, text: '보통' },
      unacceptable: { icon: XCircle, text: '불량' }
    };
    return statusMap[status];
  }, [status]);

  const colors = STATUS_COLORS[status][isDark ? 'dark' : 'light'];
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeClasses[size]} ${colors.bg} ${colors.text} ${colors.border}`}>
      <Icon className={iconSizes[size]} />
      {config.text}
    </span>
  );
});

// 로고 컴포넌트 (위치 조정)
const ConsolidatedSupplyLogo = memo<{ isDark?: boolean; size?: 'sm' | 'md' | 'lg' }>(({ isDark = false, size = 'lg' }) => {
  const sizeConfig = {
    sm: { container: 'w-16 h-16' },
    md: { container: 'w-24 h-24' },
    lg: { container: 'w-64 h-64' }
  };

  const { container } = sizeConfig[size];

  return (
    <div className={`flex items-center justify-center ${container} mx-auto mb-6`}>
      <img 
        src="/logo-rokaf-supply.png"
        alt="공군 종합보급창 로고" 
        className="w-full h-full object-contain"
        style={{
          filter: isDark ? 'brightness(1.1)' : 'none'
        }}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent && !parent.querySelector('.logo-fallback')) {
            const fallback = document.createElement('div');
            fallback.className = 'logo-fallback flex items-center justify-center w-full h-full bg-blue-600 text-white rounded-full text-sm font-bold';
            fallback.textContent = '종합보급창';
            parent.appendChild(fallback);
          }
        }}
      />
    </div>
  );
});

// 랜딩 페이지 (고급스러운 디자인 + 위치 조정)
const ModernLandingPage = memo<{ 
  isDark: boolean; 
  onStart: () => void;
}>(({ isDark, onStart }) => {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* 고급스러운 배경 효과 */}
      <div className="absolute inset-0 overflow-hidden">
        {/* 메인 원형 그라데이션 */}
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-400/20 via-purple-500/15 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 left-16 w-80 h-80 bg-gradient-to-tr from-indigo-400/15 via-blue-500/10 to-transparent rounded-full blur-3xl"></div>
        
        {/* 추가 장식적 요소 */}
        <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-gradient-to-r from-cyan-400/10 to-blue-500/10 rounded-full blur-2xl animate-bounce"></div>
        <div className="absolute bottom-1/4 right-1/3 w-40 h-40 bg-gradient-to-l from-purple-400/10 to-indigo-500/10 rounded-full blur-2xl"></div>
        
        {/* 미세한 패턴 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-start min-h-screen px-6 text-center pt-20">
        {/* 로고 섹션 (더 아래로 이동) */}
        <div className="transform hover:scale-105 transition-transform duration-300 mb-16 mt-16">
          <ConsolidatedSupplyLogo isDark={isDark} size="lg" />
        </div>

        {/* 타이틀 섹션 (더 아래로 이동) */}
        <div className="mb-20 space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">
            물류 작업현장<br />
            인시수 측정 타이머
          </h2>
          <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-md border border-white/20 shadow-2xl">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse"></div>
            <span className="text-blue-100 text-sm font-medium tracking-wide">
              측정, 기록, 저장, 분석을 동시에
            </span>
          </div>
        </div>

        {/* 고급스러운 기능 하이라이트 */}
        <div className="mb-20 grid grid-cols-1 gap-6 w-full max-w-sm">
          <div className="group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
            <div className="relative flex items-center space-x-4 p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                <Timer className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <div className="text-white font-semibold text-base">정밀 측정</div>
                <div className="text-blue-200 text-sm">소수수점 단위 정확한 측정 </div>
              </div>
            </div>
          </div>
          
          <div className="group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
            <div className="relative flex items-center space-x-4 p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <div className="text-white font-semibold text-base">실시간 분석</div>
                <div className="text-blue-200 text-sm">각종 통계도구 활용 및 결과 제공 </div>
              </div>
            </div>
          </div>
          
          <div className="group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-violet-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
            <div className="relative flex items-center space-x-4 p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center shadow-lg">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-1">
                <div className="text-white font-semibold text-base">분석결과 Excel 다운로드</div>
                <div className="text-blue-200 text-sm">RAW DATA 내려받기 기능 제공 </div>
              </div>
            </div>
          </div>
        </div>

        {/* 고급스러운 시작 버튼 */}
        <button
          onClick={onStart}
          className="group relative overflow-hidden px-12 py-5 rounded-2xl font-bold text-xl shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2"
        >
          {/* 버튼 배경 그라데이션 */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-blue-50 to-white rounded-2xl"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          {/* 버튼 내용 */}
          <span className="relative z-10 group-hover:text-white transition-colors duration-300 flex items-center space-x-3 text-slate-800">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center group-hover:bg-white/20 transition-all duration-300">
              <Play className="w-4 h-4 text-white" />
            </div>
            <span>시스템 시작</span>
          </span>
          
          {/* 버튼 테두리 효과 */}
          <div className="absolute inset-0 rounded-2xl border-2 border-white/20 group-hover:border-white/40 transition-colors duration-300"></div>
        </button>

        {/* 하단 상태 정보 */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-3 px-6 py-3 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
            <span className="text-blue-200 text-sm font-medium">시스템 준비 완료</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// 도움말 컴포넌트
const HelpModal = memo<{ 
  isOpen: boolean; 
  onClose: () => void; 
  theme: Theme;
}>(({ isOpen, onClose, theme }) => {
  const helpSections = useMemo(() => [
    {
      title: '⌨️ 키보드 단축키',
      icon: Settings,
      items: [
        { key: '스페이스바', desc: '타이머 시작/정지', shortcut: 'SPACE' },
        { key: 'Enter', desc: '랩타임 기록 (측정 완료)', shortcut: '⏎' },
        { key: 'Esc', desc: '타이머 중지', shortcut: 'ESC' },
        { key: 'R', desc: '타이머 리셋', shortcut: 'R' }
      ]
    },
    {
      title: '👥 작업 유형 상세',
      icon: Users,
      items: [
        { key: '물자검수팀', desc: '입고 물자의 품질 및 수량 검수 작업' },
        { key: '저장관리팀', desc: '창고 내 물자 보관 및 관리 작업' },
        { key: '포장관리팀', desc: '출고 물자 포장 및 배송 준비 작업' }
      ]
    },
    {
      title: '📊 Gage R&R 분석 가이드',
      icon: BarChart3,
      items: [
        { key: '측정 준비', desc: '최소 2명 측정자, 2개 이상 대상자 설정' },
        { key: '측정 횟수', desc: '각 조건별 최소 3회, 권장 5-10회 측정' },
        { key: '분석 기준', desc: 'R&R < 10%: 우수, 10-30%: 양호, >30%: 개선 필요' },
        { key: '상세 분석', desc: '별도 페이지에서 ANOVA 및 전문 해석 제공' }
      ]
    },
    {
      title: '🎯 측정 모범 사례',
      icon: Target,
      items: [
        { key: '일관성', desc: '동일한 조건과 방법으로 측정' },
        { key: '정확성', desc: '측정 시작과 끝 지점을 명확히 정의' },
        { key: '재현성', desc: '측정자 간 동일한 절차 준수' },
        { key: '기록', desc: '측정 조건과 특이사항 상세 기록' }
      ]
    }
  ], []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${theme.card} rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border ${theme.border}`}>
        <div className={`${theme.accent} px-6 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-6 h-6 text-white" />
              <h3 className="text-xl font-bold text-white">사용자 가이드</h3>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="space-y-8">
            {helpSections.map((section, sectionIndex) => {
              const Icon = section.icon;
              return (
                <div key={sectionIndex} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${theme.textSecondary}`} />
                    <h4 className={`text-lg font-semibold ${theme.text}`}>
                      {section.title}
                    </h4>
                  </div>
                  
                  <div className="grid gap-3">
                    {section.items.map((item, itemIndex) => (
                      <div 
                        key={itemIndex}
                        className={`p-4 rounded-lg border ${theme.border} ${theme.surface} hover:shadow-md transition-shadow`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className={`font-medium ${theme.text} mb-1`}>
                              {item.key}
                            </div>
                            <div className={`text-sm ${theme.textMuted}`}>
                              {item.desc}
                            </div>
                          </div>
                          {item.shortcut && (
                            <div className={`px-2 py-1 rounded text-xs font-mono font-medium ${theme.surface} ${theme.textSecondary} border ${theme.border}`}>
                              {item.shortcut}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`px-6 py-4 border-t ${theme.border}`}>
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className={`${theme.accent} text-white px-6 py-2 rounded-lg hover:opacity-90 transition-opacity font-medium flex items-center gap-2`}
            >
              <CheckCircle className="w-4 h-4" />
              확인했습니다
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// 기존 간단한 측정 카드 컴포넌트 (단일 책임 유지)
const MeasurementCard = memo<{
  title: string;
  value: string | number;
  unit?: string;
  icon: React.FC<any>;
  status?: 'success' | 'warning' | 'error' | 'info';
  theme: Theme;
  size?: 'sm' | 'md' | 'lg';
  isDark: boolean;
}>(({ title, value, unit, icon: Icon, status = 'info', theme, size = 'md', isDark }) => {
  const statusColors = useMemo(() => ({
    success: isDark 
      ? { bg: 'bg-green-900/30', border: 'border-green-700', icon: 'text-green-400', text: 'text-green-300' }
      : { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', text: 'text-green-800' },
    warning: isDark
      ? { bg: 'bg-yellow-900/30', border: 'border-yellow-700', icon: 'text-yellow-400', text: 'text-yellow-300' }
      : { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', text: 'text-yellow-800' },
    error: isDark
      ? { bg: 'bg-red-900/30', border: 'border-red-700', icon: 'text-red-400', text: 'text-red-300' }
      : { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', text: 'text-red-800' },
    info: isDark
      ? { bg: 'bg-blue-900/30', border: 'border-blue-700', icon: 'text-blue-400', text: 'text-blue-300' }
      : { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', text: 'text-blue-800' }
  }), [isDark]);

  const sizes = {
    sm: { card: 'p-3', icon: 'w-4 h-4', title: 'text-xs', value: 'text-sm' },
    md: { card: 'p-4', icon: 'w-5 h-5', title: 'text-sm', value: 'text-base' },
    lg: { card: 'p-6', icon: 'w-6 h-6', title: 'text-base', value: 'text-xl' }
  };

  const colors = statusColors[status];

  return (
    <div className={`${sizes[size].card} rounded-xl border transition-all duration-200 ${colors.bg} ${colors.border} hover:shadow-lg hover:scale-105`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className={`${sizes[size].icon} ${colors.icon}`} />
      </div>
      <div className={`${sizes[size].title} font-medium ${theme.textMuted} mb-1 line-clamp-1`}>
        {title}
      </div>
      <div className={`${sizes[size].value} font-bold ${colors.text} font-mono break-all`}>
        {value}{unit && <span className="text-sm font-normal ml-1">{unit}</span>}
      </div>
    </div>
  );
});

const EnhancedLogisticsTimer = () => {
  // 기본 다크모드로 설정
  const [isDark, setIsDark] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [lapTimes, setLapTimes] = useState<LapTime[]>([]);
  const [allLapTimes, setAllLapTimes] = useState<LapTime[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [selectedSessionHistory, setSelectedSessionHistory] = useState<SessionData | null>(null);

  // 토스트 상태
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    isVisible: boolean;
  }>({
    message: '',
    type: 'info',
    isVisible: false
  });

  // 필터 상태
  const [filterOperator, setFilterOperator] = useState<string>('');
  const [filterTarget, setFilterTarget] = useState<string>('');

  // 폼 상태
  const [sessionName, setSessionName] = useState('');
  const [workType, setWorkType] = useState('');
  const [operators, setOperators] = useState<string[]>(['']);
  const [targets, setTargets] = useState<string[]>(['']);
  const [currentOperator, setCurrentOperator] = useState('');
  const [currentTarget, setCurrentTarget] = useState('');

  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // 뒤로가기 방지 훅
  const { showBackWarning } = useBackButtonPrevention();

  const theme = useMemo(() => THEME_COLORS[isDark ? 'dark' : 'light'], [isDark]);

  // 토스트 메시지 표시 함수
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ message, type, isVisible: true });
  }, []);

  // 다크모드 적용
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // 타이머 로직
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setCurrentTime(Date.now() - startTimeRef.current);
      }, 10);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  // 키보드 이벤트
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (showNewSessionModal || showHelp || selectedSessionHistory) return;
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          toggleTimer();
          break;
        case 'Enter':
          e.preventDefault();
          recordLap();
          break;
        case 'Escape':
          e.preventDefault();
          stopTimer();
          break;
        case 'KeyR':
          e.preventDefault();
          resetTimer();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isRunning, currentSession, currentOperator, currentTarget, showNewSessionModal, showHelp, selectedSessionHistory]);

  // 타이머 제어 함수들
  const toggleTimer = useCallback(() => {
    if (!currentSession) {
      showToast('먼저 작업 세션을 생성해주세요.', 'warning');
      return;
    }

    if (isRunning) {
      setIsRunning(false);
    } else {
      startTimeRef.current = Date.now() - currentTime;
      setIsRunning(true);
    }
  }, [isRunning, currentTime, currentSession, showToast]);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
    setCurrentTime(0);
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setCurrentTime(0);
    setLapTimes([]);
    setAllLapTimes(prev => prev.filter(lap => lap.sessionId !== currentSession?.id));
    
    if (currentSession) {
      const updatedSession = { ...currentSession, lapTimes: [] };
      setCurrentSession(updatedSession);
      setSessions(prev => prev.map(s => s.id === currentSession.id ? updatedSession : s));
    }
    showToast('측정 기록이 모두 초기화되었습니다.', 'success');
  }, [currentSession, showToast]);

  const recordLap = useCallback(() => {
    if (!currentSession || !currentOperator || !currentTarget) {
      showToast('측정자와 대상자를 선택해주세요.', 'warning');
      return;
    }

    if (currentTime === 0) {
      showToast('측정 시간이 0입니다. 타이머를 시작해주세요.', 'warning');
      return;
    }

    const newLap: LapTime = {
      id: Date.now(),
      time: currentTime,
      timestamp: new Date().toLocaleString('ko-KR'),
      operator: currentOperator,
      target: currentTarget,
      sessionId: currentSession.id
    };

    const updatedLaps = [...lapTimes, newLap];
    setLapTimes(updatedLaps);
    setAllLapTimes(prev => [...prev, newLap]);

    // 랩타임 기록 시 자동 중지 및 시간 초기화
    setIsRunning(false);
    setCurrentTime(0);

    // 세션 업데이트
    const updatedSession = { ...currentSession, lapTimes: updatedLaps };
    setCurrentSession(updatedSession);
    setSessions(prev => prev.map(s => s.id === currentSession.id ? updatedSession : s));

    showToast('측정이 완료되었습니다.', 'success');
  }, [currentTime, currentSession, currentOperator, currentTarget, lapTimes, showToast]);

  // 개별 측정 기록 삭제
  const deleteLapTime = useCallback((lapId: number) => {
    const updatedLaps = lapTimes.filter(lap => lap.id !== lapId);
    const updatedAllLaps = allLapTimes.filter(lap => lap.id !== lapId);
    
    setLapTimes(updatedLaps);
    setAllLapTimes(updatedAllLaps);

    if (currentSession) {
      const updatedSession = { ...currentSession, lapTimes: updatedLaps };
      setCurrentSession(updatedSession);
      setSessions(prev => prev.map(s => s.id === currentSession.id ? updatedSession : s));
    }
    
    showToast('측정 기록이 삭제되었습니다.', 'success');
  }, [lapTimes, allLapTimes, currentSession, showToast]);

  // 세션 관리 함수들
  const createSession = useCallback(() => {
    if (!sessionName || !workType || operators.some(op => !op.trim()) || targets.some(tg => !tg.trim())) {
      showToast('모든 필드를 입력해주세요.', 'warning');
      return;
    }

    const newSession: SessionData = {
      id: Date.now().toString(),
      name: sessionName,
      workType,
      operators: operators.filter(op => op.trim()),
      targets: targets.filter(tg => tg.trim()),
      lapTimes: [],
      startTime: new Date().toLocaleString('ko-KR'),
      isActive: true
    };

    setSessions(prev => [...prev, newSession]);
    setCurrentSession(newSession);
    setCurrentOperator(newSession.operators[0]);
    setCurrentTarget(newSession.targets[0]);
    setShowNewSessionModal(false);

    // 새 세션 시작 시 자동 리셋
    setLapTimes([]);
    setCurrentTime(0);
    setIsRunning(false);

    // 폼 리셋
    setSessionName('');
    setWorkType('');
    setOperators(['']);
    setTargets(['']);

    showToast('새 세션이 생성되었습니다.', 'success');
  }, [sessionName, workType, operators, targets, showToast]);

  // 측정자/대상자 추가/삭제 함수
  const addOperator = useCallback(() => setOperators(prev => [...prev, '']), []);
  const removeOperator = useCallback((index: number) => {
    if (operators.length > 1) {
      setOperators(operators.filter((_, i) => i !== index));
    }
  }, [operators]);

  const addTarget = useCallback(() => setTargets(prev => [...prev, '']), []);
  const removeTarget = useCallback((index: number) => {
    if (targets.length > 1) {
      setTargets(targets.filter((_, i) => i !== index));
    }
  }, [targets]);

  // 측정 기록만 다운로드 (완전 수정)
  const downloadMeasurementData = useCallback(() => {
    if (lapTimes.length === 0) {
      showToast('다운로드할 측정 기록이 없습니다.', 'warning');
      return;
    }

    if (!currentSession) {
      showToast('활성 세션이 없습니다.', 'error');
      return;
    }

    const measurementData: (string | number)[][] = [
      ['=== 측정 기록 ==='],
      [''],
      ['세션명', currentSession.name],
      ['작업유형', currentSession.workType],
      ['측정일시', currentSession.startTime],
      ['총 측정횟수', lapTimes.length],
      [''],
      ['순번', '측정시간', '측정자', '대상자', '기록시간'],
      ...lapTimes.map((lap, index) => [
        index + 1,
        formatTime(lap.time),
        lap.operator,
        lap.target,
        lap.timestamp
      ])
    ];

    const csvContent = createCSVContent(measurementData);
    const filename = generateFileName('측정기록', currentSession.name);
    
    if (downloadCSVFile(csvContent, filename)) {
      showToast('측정 기록이 다운로드되었습니다.', 'success');
    } else {
      showToast('다운로드에 실패했습니다. 다시 시도해주세요.', 'error');
    }
  }, [lapTimes, currentSession, showToast]);

  // 필터링된 측정 기록
  const filteredLapTimes = useMemo(() => {
    return lapTimes.filter(lap => {
      return (!filterOperator || lap.operator === filterOperator) &&
             (!filterTarget || lap.target === filterTarget);
    });
  }, [lapTimes, filterOperator, filterTarget]);

  const analysis = useMemo(() => {
    return currentSession && lapTimes.length >= 6 ? calculateGageRR(lapTimes) : null;
  }, [currentSession, lapTimes]);

  // 랜딩 페이지
  if (showLanding) {
    return <ModernLandingPage isDark={isDark} onStart={() => setShowLanding(false)} />;
  }

  return (
    <div className={`min-h-screen ${theme.bg}`}>
      {/* 토스트 메시지 */}
      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />

      {/* 뒤로가기 경고 */}
      <BackWarning isVisible={showBackWarning} />

      {/* 헤더 */}
      <div className={`${theme.card} shadow-sm border-b ${theme.border} sticky top-0 z-40`}>
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <Zap className="w-6 h-6 text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className={`text-base font-bold ${theme.text} truncate`}>
                  물류 인시수 측정 타이머
                </h1>
                <div className={`text-xs ${theme.textMuted} truncate`}>
                  측정부터 분석까지 한번에  
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={() => setIsDark(!isDark)}
                className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:${theme.textSecondary} ${theme.surfaceHover}`}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setShowHelp(true)}
                className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:${theme.textSecondary} ${theme.surfaceHover}`}
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowLanding(true)}
                className={`p-2 rounded-lg transition-colors ${theme.textMuted} hover:text-red-500 ${theme.surfaceHover}`}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* 작업 세션 섹션 */}
        <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <h2 className={`font-semibold ${theme.text}`}>작업 세션</h2>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowNewSessionModal(true)}
                className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-600 flex items-center space-x-1 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>새 세션</span>
              </button>
              <button
                onClick={resetTimer}
                className="bg-orange-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-orange-600 flex items-center space-x-1 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>초기화</span>
              </button>
            </div>
          </div>

          {currentSession ? (
            <div className="space-y-3">
              <div className={`text-sm ${theme.textMuted}`}>
                <div className={`font-medium ${theme.text} mb-1 truncate`}>{currentSession.name}</div>
                <div className="truncate">{currentSession.workType}</div>
              </div>

              {/* 측정자/대상자 선택 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-medium ${theme.textSecondary} mb-1`}>측정자</label>
                  <select
                    value={currentOperator}
                    onChange={(e) => setCurrentOperator(e.target.value)}
                    className={`w-full p-2 border rounded text-sm ${theme.input}`}
                  >
                    {currentSession.operators.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-medium ${theme.textSecondary} mb-1`}>대상자</label>
                  <select
                    value={currentTarget}
                    onChange={(e) => setCurrentTarget(e.target.value)}
                    className={`w-full p-2 border rounded text-sm ${theme.input}`}
                  >
                    {currentSession.targets.map(tg => (
                      <option key={tg} value={tg}>{tg}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className={`text-sm ${theme.textMuted}`}>활성 세션이 없습니다.</p>
              <p className={`text-xs ${theme.textMuted}`}>새 세션을 생성해주세요.</p>
            </div>
          )}
        </div>

        {/* 정밀 타이머 섹션 */}
        <div className={`${theme.card} rounded-lg p-6 shadow-sm border ${theme.border}`}>
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="w-6 h-6 text-blue-500" />
            <h2 className={`font-semibold ${theme.text}`}>정밀 타이머</h2>
          </div>

          <div className="text-center">
            <div className={`text-4xl sm:text-5xl font-mono font-bold mb-6 ${theme.text} tracking-wider`}>
              {formatTime(currentTime)}
            </div>
            <div className={`text-sm ${theme.textMuted} mb-6`}>
              {isRunning ? '측정 중...' : '대기 중'}
            </div>

            {/* 버튼 레이아웃 */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <button
                onClick={toggleTimer}
                disabled={!currentSession}
                className={`flex items-center justify-center space-x-2 py-3 rounded-lg font-semibold transition-colors ${
                  isRunning
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                } disabled:bg-gray-300 disabled:cursor-not-allowed`}
              >
                {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                <span className="text-sm">{isRunning ? '정지' : '시작'}</span>
              </button>

              <button
                onClick={recordLap}
                disabled={!currentSession}
                className="flex items-center justify-center space-x-2 bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Target className="w-5 h-5" />
                <span className="text-sm">랩타임</span>
              </button>

              <button
                onClick={stopTimer}
                className={`flex items-center justify-center space-x-2 py-3 rounded-lg font-semibold transition-colors ${
                  isDark ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-500 hover:bg-gray-600 text-white'
                }`}
              >
                <Square className="w-5 h-5" />
                <span className="text-sm">중지</span>
              </button>
            </div>
          </div>
        </div>

        {/* 실시간 분석 섹션 */}
        {lapTimes.length > 0 && (
          <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-green-500" />
                <h2 className={`font-semibold ${theme.text}`}>실시간 분석</h2>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-sm mb-4">
              <MeasurementCard
                title="측정 횟수"
                value={lapTimes.length}
                icon={Timer}
                status="info"
                theme={theme}
                size="sm"
                isDark={isDark}
              />
              
              <MeasurementCard
                title="평균 시간"
                value={formatTime(lapTimes.reduce((sum, lap) => sum + lap.time, 0) / lapTimes.length)}
                icon={Clock}
                status="success"
                theme={theme}
                size="sm"
                isDark={isDark}
              />

              <MeasurementCard
                title="변동계수"
                value={lapTimes.length > 1 ? 
                  `${((Math.sqrt(lapTimes.reduce((acc, lap) => {
                    const mean = lapTimes.reduce((sum, l) => sum + l.time, 0) / lapTimes.length;
                    return acc + Math.pow(lap.time - mean, 2);
                  }, 0) / lapTimes.length) / (lapTimes.reduce((sum, lap) => sum + lap.time, 0) / lapTimes.length)) * 100).toFixed(1)}%` 
                  : '0%'
                }
                icon={Activity}
                status="warning"
                theme={theme}
                size="sm"
                isDark={isDark}
              />
            </div>

            {/* Gage R&R 분석 결과 */}
            {analysis && lapTimes.length >= 6 && (
              <div className="grid grid-cols-3 gap-3 text-center text-sm mb-4">
                <MeasurementCard
                  title="Gage R&R"
                  value={`${analysis.gageRRPercent.toFixed(1)}%`}
                  icon={BarChart3}
                  status={analysis.status === 'excellent' || analysis.status === 'acceptable' ? 'success' : 'error'}
                  theme={theme}
                  size="sm"
                  isDark={isDark}
                />
                
                <MeasurementCard
                  title="Cpk"
                  value={analysis.cpk.toFixed(2)}
                  icon={Target}
                  status={analysis.cpk >= 1.33 ? 'success' : analysis.cpk >= 1.0 ? 'warning' : 'error'}
                  theme={theme}
                  size="sm"
                  isDark={isDark}
                />

                <MeasurementCard
                  title="NDC"
                  value={analysis.ndc}
                  icon={Calculator}
                  status={analysis.ndc >= 5 ? 'success' : analysis.ndc >= 3 ? 'warning' : 'error'}
                  theme={theme}
                  size="sm"
                  isDark={isDark}
                />
              </div>
            )}

            {/* 간략한 상태 표시 */}
            {analysis && lapTimes.length >= 6 && (
              <div className={`${theme.surface} p-3 rounded-lg border ${theme.border} text-center`}>
                <StatusBadge status={analysis.status} size="md" isDark={isDark} />
                <p className={`text-sm ${theme.textMuted} mt-2`}>
                  총 {lapTimes.length}회 측정 완료
                </p>
              </div>
            )}
          </div>
        )}

        {/* 액션 버튼들 */}
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={downloadMeasurementData}
            disabled={lapTimes.length === 0}
            className="bg-green-500 text-white py-3 rounded-lg text-sm font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>측정 기록 다운로드</span>
          </button>
        </div>

        {/* 측정 기록 섹션 */}
        {currentSession && (
          <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-purple-500" />
                <h2 className={`font-semibold ${theme.text}`}>측정 기록</h2>
                <span className={`text-sm ${theme.textMuted}`}>
                  {filteredLapTimes.length}개
                </span>
              </div>
              <button
                onClick={() => setFilterOperator(filterOperator ? '' : currentSession.operators[0])}
                className={`text-blue-500 text-sm hover:text-blue-700 transition-colors p-1 rounded ${theme.surfaceHover}`}
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

            {/* 필터 섹션 */}
            {filterOperator && (
              <div className={`mb-4 p-3 rounded-lg border ${theme.border} ${theme.surface}`}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-medium ${theme.textSecondary} mb-1`}>측정자 필터</label>
                    <select
                      value={filterOperator}
                      onChange={(e) => setFilterOperator(e.target.value)}
                      className={`w-full p-2 border rounded text-sm ${theme.input}`}
                    >
                      <option value="">전체</option>
                      {currentSession.operators.map(op => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs font-medium ${theme.textSecondary} mb-1`}>대상자 필터</label>
                    <select
                      value={filterTarget}
                      onChange={(e) => setFilterTarget(e.target.value)}
                      className={`w-full p-2 border rounded text-sm ${theme.input}`}
                    >
                      <option value="">전체</option>
                      {currentSession.targets.map(tg => (
                        <option key={tg} value={tg}>{tg}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {(filterOperator || filterTarget) && (
                  <button
                    onClick={() => {
                      setFilterOperator('');
                      setFilterTarget('');
                    }}
                    className="mt-2 text-xs text-blue-500 hover:text-blue-700 transition-colors"
                  >
                    필터 초기화
                  </button>
                )}
              </div>
            )}
            
            {filteredLapTimes.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filteredLapTimes
                  .slice()
                  .reverse()
                  .map((lap, index) => (
                  <div key={lap.id} className={`${theme.surface} p-3 rounded-lg border-l-4 border-blue-500 transition-all hover:shadow-md ${theme.surfaceHover}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-lg font-bold text-blue-600 mb-2">
                          {formatTime(lap.time)}
                        </div>
                        <div className={`text-xs ${theme.textMuted} space-y-1`}>
                          <div className="flex items-center gap-2">
                            <Users className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">측정자: <span className={`font-medium ${theme.textSecondary}`}>{lap.operator}</span></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Target className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">대상자: <span className={`font-medium ${theme.textSecondary}`}>{lap.target}</span></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{lap.timestamp}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className={`text-xs ${theme.textMuted} text-right`}>
                          #{filteredLapTimes.length - index}
                        </div>
                        <button
                          onClick={() => deleteLapTime(lap.id)}
                          className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="측정 기록 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className={`text-sm ${theme.textMuted}`}>
                  {lapTimes.length === 0 ? '측정 기록이 없습니다.' : '필터 조건에 맞는 기록이 없습니다.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 세션 히스토리 */}
        {sessions.length > 0 && (
          <div className={`${theme.card} rounded-lg p-4 shadow-sm border ${theme.border}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-gray-500" />
                <h2 className={`font-semibold ${theme.text}`}>세션 히스토리</h2>
              </div>
              <button
                onClick={() => {
                  setSessions([]);
                  setCurrentSession(null);
                  setLapTimes([]);
                  setAllLapTimes([]);
                  setCurrentTime(0);
                  setIsRunning(false);
                  showToast('모든 세션 히스토리가 삭제되었습니다.', 'success');
                }}
                className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                title="모든 세션 히스토리 삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              {sessions.slice(-5).reverse().map(session => {
                const sessionLapCount = allLapTimes.filter(lap => lap.sessionId === session.id).length;
                return (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSessionHistory(session)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      currentSession?.id === session.id
                        ? isDark ? 'border-blue-400 bg-blue-900/20' : 'border-blue-500 bg-blue-50'
                        : `${theme.border} ${theme.surface} ${theme.surfaceHover}`
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm ${theme.text} truncate`}>{session.name}</div>
                        <div className={`text-xs ${theme.textMuted} truncate`}>{session.workType}</div>
                        <div className={`text-xs ${theme.textMuted} truncate`}>{session.startTime}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-sm font-medium ${theme.text}`}>
                          {sessionLapCount}회
                        </div>
                        {currentSession?.id === session.id && (
                          <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded">
                            활성
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 하단 여백 */}
        <div className="h-8"></div>
      </div>

      {/* 새 세션 생성 모달 */}
      {showNewSessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${theme.card} rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border ${theme.border}`}>
            <div className="p-6">
              <h3 className={`text-xl font-bold mb-4 ${theme.text}`}>새 작업 세션 생성</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme.textSecondary}`}>세션명 *</label>
                    <input
                      type="text"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      placeholder="예: 검수-000-001"
                      className={`w-full p-3 border rounded-lg text-sm ${theme.input}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme.textSecondary}`}>작업 유형 *</label>
                    <select
                      value={workType}
                      onChange={(e) => setWorkType(e.target.value)}
                      className={`w-full p-3 border rounded-lg text-sm ${theme.input}`}
                    >
                      <option value="">작업 유형 선택</option>
                      <option value="물자검수팀">물자검수팀</option>
                      <option value="저장관리팀">저장관리팀</option>
                      <option value="포장관리팀">포장관리팀</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-sm font-medium ${theme.textSecondary}`}>측정자 설정</label>
                    <button
                      onClick={addOperator}
                      className="bg-blue-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-600 transition-colors"
                    >
                      <Plus className="w-3 h-3 inline mr-1" />
                      추가
                    </button>
                  </div>
                  {operators.map((operator, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={operator}
                        onChange={(e) => {
                          const newOperators = [...operators];
                          newOperators[index] = e.target.value;
                          setOperators(newOperators);
                        }}
                        placeholder={`측정자 ${index + 1} (예: 6급 조봉근)`}
                        className={`flex-1 p-2 border rounded text-sm ${theme.input}`}
                      />
                      {operators.length > 1 && (
                        <button
                          onClick={() => removeOperator(index)}
                          className="text-red-500 hover:text-red-700 transition-colors p-2"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-sm font-medium ${theme.textSecondary}`}>대상자 설정</label>
                    <button
                      onClick={addTarget}
                      className="bg-green-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-green-600 transition-colors"
                    >
                      <Plus className="w-3 h-3 inline mr-1" />
                      추가
                    </button>
                  </div>
                  {targets.map((target, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={target}
                        onChange={(e) => {
                          const newTargets = [...targets];
                          newTargets[index] = e.target.value;
                          setTargets(newTargets);
                        }}
                        placeholder={`대상자 ${index + 1} (예: 7급 김공군)`}
                        className={`flex-1 p-2 border rounded text-sm ${theme.input}`}
                      />
                      {targets.length > 1 && (
                        <button
                          onClick={() => removeTarget(index)}
                          className="text-red-500 hover:text-red-700 transition-colors p-2"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className={`${isDark ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} p-4 rounded-lg border`}>
                  <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Gage R&R 분석 안내
                  </h4>
                  <ul className={`${isDark ? 'text-blue-300' : 'text-blue-700'} space-y-1 text-xs`}>
                    <li>• 측정자 2명 이상: 재현성(Reproducibility) 분석</li>
                    <li>• 대상자 2개 이상: 대상자간 변동성 분석</li>
                    <li>• 최소 6회 측정: 신뢰성 있는 분석 결과</li>
                    <li>• 권장 측정 횟수: 각 조건별 3-5회</li>
                  </ul>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowNewSessionModal(false)}
                  className={`flex-1 border py-3 rounded-lg font-medium transition-colors ${theme.border} ${theme.textSecondary} ${theme.surfaceHover}`}
                >
                  취소
                </button>
                <button
                  onClick={createSession}
                  className="flex-1 bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 flex items-center justify-center space-x-2 transition-colors"
                >
                  <Users className="w-4 h-4" />
                  <span>세션 생성</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 세션 히스토리 상세 모달 */}
      {selectedSessionHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${theme.card} rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border ${theme.border}`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-xl font-bold ${theme.text}`}>세션 상세 정보</h3>
                <button
                  onClick={() => setSelectedSessionHistory(null)}
                  className={`${theme.textMuted} hover:${theme.textSecondary} transition-colors p-1`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <div className={`text-sm ${theme.textMuted}`}>세션명</div>
                    <div className={`font-medium ${theme.text} truncate`}>{selectedSessionHistory.name}</div>
                  </div>
                  <div>
                    <div className={`text-sm ${theme.textMuted}`}>작업유형</div>
                    <div className={`font-medium ${theme.text} truncate`}>{selectedSessionHistory.workType}</div>
                  </div>
                  <div>
                    <div className={`text-sm ${theme.textMuted}`}>측정자</div>
                    <div className={`font-medium ${theme.text} break-words`}>{selectedSessionHistory.operators.join(', ')}</div>
                  </div>
                  <div>
                    <div className={`text-sm ${theme.textMuted}`}>대상자</div>
                    <div className={`font-medium ${theme.text} break-words`}>{selectedSessionHistory.targets.join(', ')}</div>
                  </div>
                </div>

                <div>
                  <div className={`text-sm ${theme.textMuted} mb-2`}>측정 기록</div>
                  <div className={`${theme.surface} p-3 rounded-lg`}>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${theme.text}`}>
                        {allLapTimes.filter(lap => lap.sessionId === selectedSessionHistory.id).length}
                      </div>
                      <div className={`text-sm ${theme.textMuted}`}>총 측정 횟수</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setCurrentSession(selectedSessionHistory);
                      setLapTimes(allLapTimes.filter(lap => lap.sessionId === selectedSessionHistory.id));
                      setCurrentOperator(selectedSessionHistory.operators[0]);
                      setCurrentTarget(selectedSessionHistory.targets[0]);
                      setSelectedSessionHistory(null);
                      showToast('세션이 활성화되었습니다.', 'success');
                    }}
                    className="flex-1 bg-blue-500 text-white py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                  >
                    이 세션으로 전환
                  </button>
                  <button
                    onClick={() => setSelectedSessionHistory(null)}
                    className={`flex-1 border py-2 rounded-lg font-medium transition-colors ${theme.border} ${theme.textSecondary} ${theme.surfaceHover}`}
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 도움말 모달 */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} theme={theme} />
    </div>
  );
};

export default EnhancedLogisticsTimer;
EOF

# package.json 업데이트 - scripts 섹션 추가/수정
echo "📝 package.json scripts 섹션 업데이트 중..."
if [ -f "package.json" ]; then
    # package.json이 존재하는 경우에만 업데이트
    if command -v jq &> /dev/null; then
        # jq가 설치되어 있는 경우
        jq '.scripts.dev = "vite" | .scripts.build = "vite build" | .scripts.preview = "vite preview" | .scripts.serve = "vite preview --port 3000"' package.json > package.json.tmp && mv package.json.tmp package.json
    else
        # jq가 없는 경우 수동으로 추가
        echo "⚠️  jq를 찾을 수 없어 수동으로 scripts를 추가해주세요:"
        echo '  "scripts": {'
        echo '    "dev": "vite",'
        echo '    "build": "vite build",'
        echo '    "preview": "vite preview",'
        echo '    "serve": "vite preview --port 3000"'
        echo '  }'
    fi
fi

# .gitignore 파일 생성/업데이트
echo "📝 .gitignore 파일 설정 중..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Production builds
/dist
/build

# Development
.vite
.cache

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# ESLint cache
.eslintcache

# Backup files
backup_*/
EOF

# README.md 업데이트
echo "📚 README.md 파일 업데이트 중..."
cat > README.md << 'EOF'
# 물류 작업현장 인시수 측정 타이머

공군 종합보급창의 물류 작업현장에서 사용하는 정밀한 인시수 측정 및 Gage R&R 분석 도구입니다.

## 🚀 주요 기능

### ⏱️ 정밀 타이머
- 소수점 단위 정확한 시간 측정
- 키보드 단축키 지원 (스페이스바: 시작/정지, Enter: 랩타임 기록)
- 모바일 최적화된 반응형 UI

### 📊 실시간 분석
- Gage R&R 분석 (반복성, 재현성, 측정시스템 평가)
- ANOVA 분산 분석
- 공정 능력 지수 (Cpk) 계산
- 구별 범주 수 (NDC) 분석

### 📈 세션 관리
- 다중 측정자/대상자 설정
- 세션별 측정 기록 관리
- 측정 데이터 필터링

### 💾 데이터 관리
- CSV 형식 측정 기록 다운로드
- 상세 분석 보고서 생성
- UTF-8 인코딩으로 한글 완벽 지원

## 🛠️ 기술 스택

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Package Manager**: npm

## 🏗️ 설치 및 실행

### 개발 환경
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 프로덕션 빌드
```bash
# 빌드
npm run build

# 빌드 미리보기
npm run preview
```

## 📱 사용법

### 1. 세션 생성
1. "새 세션" 버튼 클릭
2. 세션명, 작업 유형 입력
3. 측정자와 대상자 설정 (각각 2명 이상 권장)

### 2. 측정 진행
1. 측정자와 대상자 선택
2. 스페이스바로 타이머 시작/정지
3. Enter 키로 측정 완료 기록

### 3. 결과 분석
- 실시간 통계 확인
- 6회 이상 측정 후 Gage R&R 분석 가능
- CSV 다운로드로 상세 데이터 확보

## 🎯 Gage R&R 분석 기준

| 구분 | R&R 비율 | 평가 |
|------|----------|------|
| 우수 | < 10% | 측정시스템 우수 |
| 양호 | 10-30% | 사용 가능, 모니터링 필요 |
| 보통 | 30-50% | 제한적 사용, 개선 권장 |
| 불량 | > 50% | 즉시 개선 필요 |

## 🔧 개발자 정보

- **개발**: 공군 종합보급창 디지털혁신팀
- **버전**: 2.0.0
- **업데이트**: 2024.12

## 📄 라이선스

이 프로젝트는 공군 종합보급창의 내부 사용을 위한 도구입니다.
EOF

echo "✅ 모든 파일 업데이트가 완료되었습니다!"
echo ""
echo "🎉 업데이트 요약:"
echo "   📦 의존성 패키지 설치 완료"
echo "   🎨 Tailwind CSS 설정 완료"
echo "   ⚡ Vite 빌드 도구 설정 완료"
echo "   📱 App.tsx 완전 교체 완료"
echo "   🖼️  기본 로고 이미지 생성 완료"
echo "   📝 설정 파일들 업데이트 완료"
echo ""
echo "🚀 다음 단계:"
echo "   1. npm install (의존성 재설치)"
echo "   2. npm run dev (개발 서버 실행)"
echo "   3. http://localhost:3000 에서 확인"
echo ""
echo "💡 팁:"
echo "   - 기존 파일은 '$BACKUP_DIR' 폴더에 백업되었습니다"
echo "   - 문제 발생 시 백업에서 복구 가능합니다"
echo "   - Git commit 전에 기능 테스트를 권장합니다"
echo ""
echo "🔍 변경사항 확인:"
echo "   git status"
echo "   git diff"
echo ""
echo "✨ 업데이트 완료! LogisticsTimer가 최신 기능으로 업그레이드되었습니다."