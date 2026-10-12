"use client";

import { createContext, useContext, useState, useCallback } from "react";

const ScanContext = createContext<{
  scanY: number;
  handleScanProgress: (y: number) => void;
}>({
  scanY: 50,
  handleScanProgress: () => {},
});

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [scanY, setScanY] = useState(50);
  const handleScanProgress = useCallback((y: number) => {
    setScanY(y);
  }, []);

  return (
    <ScanContext.Provider value={{ scanY, handleScanProgress }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  return useContext(ScanContext);
}
