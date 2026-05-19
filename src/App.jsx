import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import Workspace from './components/Workspace';
import Footer from './components/Footer';

function App() {
  const [files, setFiles] = useState([]);
  const [theme, setTheme] = useState('light');

  // Initialize theme based on system preference
  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
      setTheme('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  const handleFilesSelect = (newFiles) => {
    const filesArray = Array.from(newFiles);
    setFiles(prev => [...prev, ...filesArray]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setFiles([]);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)', transition: 'background-color var(--transition-normal)' }}>
      <Navbar 
        theme={theme} 
        toggleTheme={toggleTheme}
      />
      
      <main style={{ flex: 1 }}>
        {files.length > 0 ? (
          <Workspace files={files} setFiles={setFiles} onReset={handleReset} />
        ) : (
          <LandingPage onFileSelect={handleFilesSelect} />
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
