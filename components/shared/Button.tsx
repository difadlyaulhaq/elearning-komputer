import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'dark' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ComponentType<{ size?: number }>;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon: Icon, 
  iconPosition = 'left',
  fullWidth = false,
  disabled = false,
  onClick,
  className = '',
  type = 'button'
}) => {
  
  const baseStyles = 'font-semibold rounded-lg transition-all transform active:scale-[0.98] flex items-center justify-center space-x-2';
  
  const variants = {
    primary: 'bg-[#0066FF] text-white hover:bg-[#0052CC] shadow-md hover:shadow-lg',
    secondary: 'bg-white border-2 border-[#0066FF] text-[#0066FF] hover:bg-[#E6F0FF]',
    danger: 'bg-brand-danger text-white hover:bg-brand-danger/80 shadow-md',
    success: 'bg-brand-success text-white hover:bg-brand-success/80 shadow-md',
    ghost: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50',
    dark: 'bg-black text-white hover:bg-gray-900 shadow-md',
    outline: 'bg-transparent border-2 border-black text-black hover:bg-black hover:text-white'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  const disabledStyles = 'opacity-50 cursor-not-allowed pointer-events-none';
  const widthStyles = fullWidth ? 'w-full' : '';
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${widthStyles}
        ${disabled ? disabledStyles : ''}
        ${className}
      `}
    >
      {Icon && iconPosition === 'left' && <Icon size={20} />}
      <span>{children}</span>
      {Icon && iconPosition === 'right' && <Icon size={20} />}
    </button>
  );
};

export default Button;