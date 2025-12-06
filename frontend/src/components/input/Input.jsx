import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function Input({ 
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  error,
  required = false,
  icon: Icon,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);

  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className={`
        relative flex items-center border-2 rounded-lg bg-white transition-all duration-200
        ${focused ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-slate-300'}
        ${error ? 'border-red-500' : ''}
        hover:border-slate-400
      `}>
        {Icon && (
          <div className="pl-4 pr-2 text-slate-400 flex items-center">
            <Icon className="w-5 h-5" />
          </div>
        )}
        
        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`flex-1 px-4 py-2.5 border-none outline-none text-sm bg-transparent text-slate-800 placeholder-slate-400
            ${type === 'password' ? 'pr-12' : ''}  /* extra padding for eye icon */
          `}
          {...props}
        />
        
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      
      {error && (
        <span className="text-sm text-red-500 mt-1">{error}</span>
      )}
    </div>
  );
}