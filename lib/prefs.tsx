import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// Per-device dashboard preferences (stored in localStorage, not the account),
// so e.g. a husband and wife sharing the app on their own phones can each
// choose what they see — cycle tracking off on his device, on on hers.
export interface DashboardPrefs {
  cycle: boolean;
  body_fat: boolean;
  protein: boolean;
  steps: boolean;
  water: boolean;
  score: boolean;
}

export const DEFAULT_PREFS: DashboardPrefs = {
  cycle: true,
  body_fat: true,
  protein: true,
  steps: true,
  water: true,
  score: true,
};

const STORAGE_KEY = 'dashboard_prefs';

function loadPrefs(): DashboardPrefs {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_PREFS;
}

interface PrefsValue {
  prefs: DashboardPrefs;
  setPref: (key: keyof DashboardPrefs, value: boolean) => void;
}

const PrefsContext = createContext<PrefsValue>({
  prefs: DEFAULT_PREFS,
  setPref: () => {},
});

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<DashboardPrefs>(loadPrefs);

  const setPref = useCallback((key: keyof DashboardPrefs, value: boolean) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: value };
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return <PrefsContext.Provider value={{ prefs, setPref }}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsValue {
  return useContext(PrefsContext);
}
