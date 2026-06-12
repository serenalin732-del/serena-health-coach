import { useEffect } from 'react';

// Web: re-run a fetch when the tab/app regains focus or becomes visible again,
// so data written elsewhere while the app was backgrounded — e.g. an iOS
// Shortcut posting steps/active energy to Supabase — shows up on return without
// needing a full reload or force-quit.
export function useVisibilityRefetch(refetch: () => void) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onActive = () => {
      if (document.visibilityState === 'visible') refetch();
    };
    document.addEventListener('visibilitychange', onActive);
    window.addEventListener('focus', onActive);
    return () => {
      document.removeEventListener('visibilitychange', onActive);
      window.removeEventListener('focus', onActive);
    };
  }, [refetch]);
}
