import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Copy, RefreshCw, Check, Shield, ShieldAlert, ShieldCheck, Settings2 } from 'lucide-react';

const PasswordGenerator: React.FC = () => {
  const [password, setPassword] = useState('');
  const [displayPassword, setDisplayPassword] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });
  const [copied, setCopied] = useState(false);
  
  const animationRef = useRef<number>();
  const mounted = useRef(false);

  const generatePassword = useCallback(() => {
    const charset = {
      uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      lowercase: 'abcdefghijklmnopqrstuvwxyz',
      numbers: '0123456789',
      symbols: '!@#$%^&*()_+~`|}{[]:;?><,./-=',
    };

    let chars = '';
    if (options.uppercase) chars += charset.uppercase;
    if (options.lowercase) chars += charset.lowercase;
    if (options.numbers) chars += charset.numbers;
    if (options.symbols) chars += charset.symbols;

    if (chars === '') {
      setPassword('');
      setDisplayPassword('');
      return;
    }

    let newPassword = '';
    const randomValues = new Uint32Array(length);
    window.crypto.getRandomValues(randomValues);
    
    for (let i = 0; i < length; i++) {
      newPassword += chars[randomValues[i] % chars.length];
    }
    
    setPassword(newPassword);
    setCopied(false);
    
    // Slot machine animation effect
    setIsGenerating(true);
    const startTime = Date.now();
    const duration = 600 + (length * 15); // Animation duration scales slightly with length

    const animate = () => {
      const now = Date.now();
      const progress = Math.min(1, (now - startTime) / duration);
      
      setDisplayPassword(newPassword.split('').map((char, index) => {
        // Characters stop spinning one by one from left to right
        // 0.3 means for the first 30% of the animation, everything spins
        const stopProgress = 0.3 + (0.7 * (index / length));
        
        if (progress >= stopProgress) {
          return char;
        }
        return chars[Math.floor(Math.random() * chars.length)];
      }).join(''));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsGenerating(false);
        setDisplayPassword(newPassword);
      }
    };
    
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(animate);
    
  }, [length, options]);

  useEffect(() => {
    generatePassword();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []); // Run once on mount

  // Auto-generate when settings change
  useEffect(() => {
    if (mounted.current) {
      generatePassword();
    } else {
      mounted.current = true;
    }
  }, [length, options, generatePassword]);

  const copyToClipboard = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const toggleOption = (key: keyof typeof options) => {
    setOptions(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (!Object.values(next).some(Boolean)) return prev; // Prevent unchecking all
      return next;
    });
  };

  const calculateStrength = () => {
    let score = 0;
    if (password.length > 8) score += 1;
    if (password.length > 12) score += 1;
    if (password.length >= 16) score += 1;
    if (options.uppercase && options.lowercase) score += 1;
    if (options.numbers) score += 1;
    if (options.symbols) score += 1;
    return score; // 0-6
  };

  const strength = calculateStrength();
  const strengthColor = strength < 3 ? 'text-red-500' : strength < 5 ? 'text-yellow-500' : 'text-green-500';
  const StrengthIcon = strength < 3 ? ShieldAlert : strength < 5 ? Shield : ShieldCheck;

  return (
    <div className="w-full h-full flex flex-col gap-4 sm:gap-6 animate-fade-in min-h-0 pb-2 sm:pb-4">
      
      {/* Top Panel: Display & Actions */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-4 sm:gap-6 relative flex-1 min-h-0">
        <div className="absolute top-6 right-6 flex items-center gap-2">
           <StrengthIcon className={`w-5 h-5 ${strengthColor}`} />
           <span className={`font-semibold text-sm ${strengthColor}`}>
             {strength < 3 ? 'Weak' : strength < 5 ? 'Good' : 'Strong'}
           </span>
        </div>

        <div className="w-full bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-4 sm:p-8 border-2 border-gray-100 dark:border-gray-800 flex-1 min-h-[100px] flex items-center justify-center mt-8 sm:mt-6 overflow-hidden">
          <span className="text-3xl sm:text-4xl md:text-5xl font-mono font-medium text-gray-900 dark:text-white tracking-tight leading-tight break-all text-center selection:bg-blue-200 dark:selection:bg-blue-900">
            {displayPassword}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full flex-shrink-0">
          <button 
            onClick={generatePassword}
            className="w-full sm:flex-1 bg-blue-600 text-white py-3 sm:py-4 px-6 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} /> 
            Generate New
          </button>
          <button 
            onClick={copyToClipboard}
            className={`w-full sm:flex-1 flex items-center justify-center gap-2 px-6 py-3 sm:py-4 rounded-2xl font-bold text-lg transition-all active:scale-[0.98] ${
              copied 
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-xl shadow-gray-900/10 dark:shadow-white/10'
            }`}
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            {copied ? 'Copied!' : 'Copy Password'}
          </button>
        </div>
      </div>

      {/* Bottom Panel: Settings */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-4 sm:gap-6 flex-shrink-0 overflow-y-auto">
        <div className="flex items-center gap-3 mb-1 sm:mb-2">
          <Settings2 className="w-6 h-6 text-blue-500" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Configuration</h3>
        </div>

        {/* Length Slider */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Password Length</label>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-xl">{length}</span>
          </div>
          <input 
            type="range" 
            min="6" 
            max="64" 
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          {(Object.keys(options) as Array<keyof typeof options>).map((key) => (
            <label key={key} className="flex items-center justify-between cursor-pointer p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <span className="text-base font-medium text-gray-700 dark:text-gray-300 capitalize">{key}</span>
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={options[key]} 
                  onChange={() => toggleOption(key)} 
                />
                <div className={`w-12 h-6 rounded-full transition-colors duration-200 ${options[key] ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow transition-transform duration-200 ${options[key] ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </div>
            </label>
          ))}
        </div>
      </div>

    </div>
  );
};

export default PasswordGenerator;
