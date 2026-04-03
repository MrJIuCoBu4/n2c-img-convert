
import React, { useState, useEffect } from 'react';
import ImageConverter from './components/ImageConverter';
import PasswordGenerator from './components/PasswordGenerator';
import { Moon, Sun, Image as ImageIcon, KeyRound } from 'lucide-react';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
             (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });
  const [currentView, setCurrentView] = useState<'image' | 'password'>('image');

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col bg-[#f9fafb] dark:bg-gray-950 text-slate-900 dark:text-gray-100 font-sans transition-colors duration-300">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 flex-shrink-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 h-16 transition-colors duration-300">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
              {currentView === 'image' ? <ImageIcon className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900 dark:text-white hidden sm:block">
              {currentView === 'image' ? 'Image Converter' : 'Password Generator'}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="flex items-center gap-1 sm:gap-2 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-2xl">
              <button
                onClick={() => setCurrentView('image')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  currentView === 'image' 
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span className="hidden md:inline">Images</span>
              </button>
              <button
                onClick={() => setCurrentView('password')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  currentView === 'password' 
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                <span className="hidden md:inline">Passwords</span>
              </button>
            </nav>

            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl transition-all duration-300 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col min-h-0">
        {currentView === 'image' ? <ImageConverter /> : <PasswordGenerator />}
      </main>
    </div>
  );
};

export default App;
