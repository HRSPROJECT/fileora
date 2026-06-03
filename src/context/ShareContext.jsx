import React, { createContext, useContext, useState } from 'react';

const ShareContext = createContext(null);

export function ShareProvider({ children }) {
  const [sharedFile, setSharedFile] = useState(null);

  const setFileToShare = (file) => {
    setSharedFile(file);
  };

  const clearSharedFile = () => {
    setSharedFile(null);
  };

  return (
    <ShareContext.Provider value={{ sharedFile, setFileToShare, clearSharedFile }}>
      {children}
    </ShareContext.Provider>
  );
}

export function useShare() {
  const context = useContext(ShareContext);
  if (!context) {
    // If not wrapped in provider, return fallback values to prevent crashes
    return {
      sharedFile: null,
      setFileToShare: () => {},
      clearSharedFile: () => {}
    };
  }
  return context;
}
