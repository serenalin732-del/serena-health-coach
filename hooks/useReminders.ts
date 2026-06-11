import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { enableWebPush, disableWebPush, isPushSupported, deviceTimezone, type EnableResult } from '@/lib/push';
import type { UserSettings } from '@/lib/types';

export type ReminderKey = 'reminder_morning' | 'reminder_lunch' | 'reminder_evening';

const DEFAULTS = {
  reminder_morning: true,
  reminder_lunch: true,
  reminder_evening: true,
  push_enabled: false,
  email_reminders: false,
};

export function useReminders(userId: string | undefined) {
  const [settings, setSettings] = useState<Partial<UserSettings>>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (mounted) {
          setSettings({ ...DEFAULTS, ...(data ?? {}) });
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [userId]);

  // Always stamp the current timezone so the sender fires at the right local
  // time. Returns the database error (or null) so callers can surface failures
  // instead of silently losing the change.
  const persist = useCallback(
    async (patch: Partial<UserSettings>): Promise<{ message: string } | null> => {
      if (!userId) return { message: 'Not signed in' };
      const next = { ...settings, ...patch };
      setSettings(next);
      const { error } = await supabase
        .from('user_settings')
        .upsert(
          { ...next, user_id: userId, timezone: deviceTimezone() },
          { onConflict: 'user_id' }
        );
      return error ?? null;
    },
    [userId, settings]
  );

  const toggle = useCallback(
    (key: ReminderKey) => persist({ [key]: !(settings[key] ?? true) } as Partial<UserSettings>),
    [persist, settings]
  );

  const setEmailReminders = useCallback(
    (enabled: boolean, email: string | null) =>
      persist({ email_reminders: enabled, reminder_email: email }),
    [persist]
  );

  // Returns the enrollment result so the UI can surface denied/unsupported states.
  const setPushEnabled = useCallback(
    async (enabled: boolean): Promise<EnableResult> => {
      if (!userId) return 'error';
      setBusy(true);
      try {
        if (enabled) {
          const result = await enableWebPush(userId);
          if (result === 'enabled') await persist({ push_enabled: true });
          return result;
        }
        await disableWebPush(userId);
        await persist({ push_enabled: false });
        return 'enabled';
      } finally {
        setBusy(false);
      }
    },
    [userId, persist]
  );

  return {
    settings,
    loading,
    busy,
    pushSupported: isPushSupported(),
    toggle,
    setEmailReminders,
    setPushEnabled,
    // Generic patch save (used for goals); returns the DB error or null.
    save: persist,
  };
}
