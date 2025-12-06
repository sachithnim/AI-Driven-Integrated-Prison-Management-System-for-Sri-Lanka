export default function Button({ 
  children, 
  type = 'button', 
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  className = '',
  ...props 
}) {
  const baseClasses = 'flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 outline-none relative overflow-hidden';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled || loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          Loading...
        </div>
      ) : (
        children
      )}
    </button>
  );
}