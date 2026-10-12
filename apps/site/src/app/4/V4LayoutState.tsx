"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const V4LayoutContext = createContext<{
  isSidebarVisible: boolean;
  setSidebarVisible: (visible: boolean) => void;
}>({
  isSidebarVisible: false,
  setSidebarVisible: () => {},
});

export function V4LayoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Sidebar defaults to true on subpages, false on root landing until animation finishes
  const [isSidebarVisible, setSidebarVisible] = useState(pathname !== "/4");

  useEffect(() => {
    if (pathname !== "/4") {
      setSidebarVisible(true);
    } else {
      setSidebarVisible(false);
    }
  }, [pathname]);

  return (
    <V4LayoutContext.Provider value={{ isSidebarVisible, setSidebarVisible }}>
      {children}
    </V4LayoutContext.Provider>
  );
}

export function useV4Layout() {
  return useContext(V4LayoutContext);
}
