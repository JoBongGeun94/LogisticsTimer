// components/UI/Button.tsx - 재사용 가능한 버튼 (SRP, OCP)
import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 재사용 가능한 버튼 컴포넌트
 * SRP: 버튼 UI와 상태 관리만 담당
 * OCP: 새로운 variant, size 확장 가능
 * LSP: HTMLButtonElement의 모든 속성 지원
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}) => {
  const getVariantClass = (variant: string) => {
    const baseClass =
      'font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

    switch (variant) {
      case 'primary':
        return `${baseClass} bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-500 shadow-lg hover:shadow-xl`;
      case 'secondary':
        return `${baseClass} bg-gray-500 hover:bg-gray-600 text-white focus:ring-gray-500 shadow-lg hover:shadow-xl`;
      case 'success':
        return `${baseClass} bg-green-500 hover:bg-green-600 text-white focus:ring-green-500 shadow-lg hover:shadow-xl`;
      case 'danger':
        return `${baseClass} bg-red-500 hover:bg-red-600 text-white focus:ring-red-500 shadow-lg hover:shadow-xl`;
      case 'warning':
        return `${baseClass} bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-500 shadow-lg hover:shadow-xl`;
      case 'info':
        return `${baseClass} bg-cyan-500 hover:bg-cyan-600 text-white focus:ring-cyan-500 shadow-lg hover:shadow-xl`;
      default:
        return `${baseClass} bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-500`;
    }
  };

  const getSizeClass = (size: string) => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm rounded-md';
      case 'md':
        return 'px-4 py-2 text-base rounded-lg';
      case 'lg':
        return 'px-6 py-3 text-lg rounded-xl';
      default:
        return 'px-4 py-2 text-base rounded-lg';
    }
  };

  const isDisabled = disabled || loading;

  return (
    <button
      className={`
        ${getVariantClass(variant)}
        ${getSizeClass(size)}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:transform hover:scale-105'}
        ${className}
        flex items-center justify-center gap-2
      `}
      disabled={isDisabled}
      {...props}
    >
      {loading && <LoadingSpinner size="sm" color="text-current" />}
      {!loading && icon && icon}
      <span>{children}</span>
    </button>
  );
};
