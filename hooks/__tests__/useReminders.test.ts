import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useReminders } from '../useReminders';

let mockSettingsRow: Record<string, unknown> | null = null;
const mockUpsertCalls: unknown[][] = [];

function mockMakeChain(): any {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: () => Promise.resolve({ data: mockSettingsRow }),
    upsert: (...args: unknown[]) => {
      mockUpsertCalls.push(args);
      return Promise.resolve({ error: null });
    },
  };
  return chain;
}

jest.mock('@/lib/supabase', () => ({
  supabase: { from: () => mockMakeChain() },
}));

jest.mock('@/lib/push', () => ({
  isPushSupported: () => false,
  deviceTimezone: () => 'America/New_York',
  enableWebPush: jest.fn(async () => 'enabled'),
  disableWebPush: jest.fn(async () => {}),
}));

beforeEach(() => {
  mockSettingsRow = null;
  mockUpsertCalls.length = 0;
});

describe('useReminders', () => {
  it('starts from sensible defaults when no row exists', async () => {
    const { result } = renderHook(() => useReminders('u1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.settings.reminder_morning).toBe(true);
    expect(result.current.settings.push_enabled).toBe(false);
    expect(result.current.settings.email_reminders).toBe(false);
  });

  it('merges a loaded row over the defaults', async () => {
    mockSettingsRow = { user_id: 'u1', reminder_morning: false, push_enabled: true };
    const { result } = renderHook(() => useReminders('u1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.settings.reminder_morning).toBe(false);
    expect(result.current.settings.push_enabled).toBe(true);
    expect(result.current.settings.reminder_lunch).toBe(true); // still default
  });

  it('toggles a reminder and upserts with user_id + timezone', async () => {
    const { result } = renderHook(() => useReminders('u1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.toggle('reminder_morning');
    });

    expect(result.current.settings.reminder_morning).toBe(false);
    const [payload, opts] = mockUpsertCalls[mockUpsertCalls.length - 1] as [any, any];
    expect(payload.reminder_morning).toBe(false);
    expect(payload.user_id).toBe('u1');
    expect(payload.timezone).toBe('America/New_York');
    expect(opts).toEqual({ onConflict: 'user_id' });
  });

  it('persists email reminder opt-in with the address', async () => {
    const { result } = renderHook(() => useReminders('u1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.setEmailReminders(true, 'serena@example.com');
    });

    const [payload] = mockUpsertCalls[mockUpsertCalls.length - 1] as [any];
    expect(payload.email_reminders).toBe(true);
    expect(payload.reminder_email).toBe('serena@example.com');
  });

  it('saves goal fields via the generic save()', async () => {
    const { result } = renderHook(() => useReminders('u1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let err;
    await act(async () => {
      err = await result.current.save({
        target_weight_kg: 55,
        target_waist_cm: 80,
        goal_focus: 'fat loss',
      });
    });

    expect(err).toBeNull();
    const [payload] = mockUpsertCalls[mockUpsertCalls.length - 1] as [any];
    expect(payload.target_weight_kg).toBe(55);
    expect(payload.target_waist_cm).toBe(80);
    expect(payload.goal_focus).toBe('fat loss');
    expect(result.current.settings.target_weight_kg).toBe(55);
  });

  it('enables push and records push_enabled when enrollment succeeds', async () => {
    const { result } = renderHook(() => useReminders('u1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let res: string | undefined;
    await act(async () => {
      res = await result.current.setPushEnabled(true);
    });

    expect(res).toBe('enabled');
    const [payload] = mockUpsertCalls[mockUpsertCalls.length - 1] as [any];
    expect(payload.push_enabled).toBe(true);
  });
});
