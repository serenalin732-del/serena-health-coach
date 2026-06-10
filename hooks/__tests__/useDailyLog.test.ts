import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useDailyLog } from '../useDailyLog';
import { HABITS } from '@/lib/types';
import type { DailyLog } from '@/lib/types';

// useDailyLog issues two reads on fetch:
//   daily_logs:        from().select().eq().eq().maybeSingle()
//   habit_completions: from().select().eq().eq()           (awaited)
// and two writes:
//   daily_logs upsert:        from().upsert().select().maybeSingle()
//   habit_completions upsert: from().upsert()              (awaited)
const responses: Record<string, { data: unknown; error?: unknown }> = {};
const upsertMock = jest.fn();

function makeQuery(table: string) {
  const readResult = Promise.resolve(responses[table] ?? { data: null });
  const chain: any = {
    select: jest.fn(() => chain),
    // Second .eq() on habit_completions is the awaited terminal call.
    eq: jest.fn(() => chain),
    maybeSingle: jest.fn(() => readResult),
    then: (...args: Parameters<Promise<unknown>['then']>) => readResult.then(...args),
    upsert: jest.fn((...args: unknown[]) => {
      upsertMock(table, ...args);
      const writeResult = Promise.resolve(responses[`${table}:upsert`] ?? { data: null, error: null });
      return {
        select: jest.fn(() => ({ maybeSingle: () => writeResult })),
        then: (...a: Parameters<Promise<unknown>['then']>) => writeResult.then(...a),
      };
    }),
  };
  return chain;
}

const mockFrom = jest.fn((table: string) => makeQuery(table));

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of Object.keys(responses)) delete responses[k];
});

describe('useDailyLog - scoring', () => {
  it('starts every habit unchecked when there are no completions', async () => {
    const { result } = renderHook(() => useDailyLog('u1', '2026-06-10'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.completedCount).toBe(0);
    expect(result.current.completionPct).toBe(0);
    expect(result.current.dailyScore).toBe(0);
    expect(result.current.totalHabits).toBe(HABITS.length);
  });

  it('counts completed habits and computes percentage/score', async () => {
    // Mark 4 of the 8 habits complete -> 50%
    responses['habit_completions'] = {
      data: [
        { habit_key: HABITS[0].key, completed: true },
        { habit_key: HABITS[1].key, completed: true },
        { habit_key: HABITS[2].key, completed: true },
        { habit_key: HABITS[3].key, completed: true },
        { habit_key: HABITS[4].key, completed: false },
      ],
    };
    const { result } = renderHook(() => useDailyLog('u1', '2026-06-10'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.completedCount).toBe(4);
    expect(result.current.completionPct).toBe(50);
    expect(result.current.dailyScore).toBe(50);
  });

  it('rounds the completion percentage (5/8 -> 63)', async () => {
    responses['habit_completions'] = {
      data: HABITS.slice(0, 5).map(h => ({ habit_key: h.key, completed: true })),
    };
    const { result } = renderHook(() => useDailyLog('u1', '2026-06-10'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.completionPct).toBe(63); // Math.round(62.5)
  });

  it('reaches 100 when all habits are complete', async () => {
    responses['habit_completions'] = {
      data: HABITS.map(h => ({ habit_key: h.key, completed: true })),
    };
    const { result } = renderHook(() => useDailyLog('u1', '2026-06-10'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.completedCount).toBe(HABITS.length);
    expect(result.current.completionPct).toBe(100);
  });
});

describe('useDailyLog - toggleHabit', () => {
  it('optimistically flips a habit and persists via upsert', async () => {
    const { result } = renderHook(() => useDailyLog('u1', '2026-06-10'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const key = HABITS[0].key;
    expect(result.current.habits[key]).toBe(false);

    await act(async () => {
      await result.current.toggleHabit(key);
    });

    expect(result.current.habits[key]).toBe(true);
    expect(result.current.completedCount).toBe(1);
    expect(upsertMock).toHaveBeenCalledWith(
      'habit_completions',
      expect.objectContaining({ habit_key: key, completed: true, user_id: 'u1', log_date: '2026-06-10' }),
      expect.anything()
    );
  });

  it('toggles a habit back off', async () => {
    responses['habit_completions'] = {
      data: [{ habit_key: HABITS[0].key, completed: true }],
    };
    const { result } = renderHook(() => useDailyLog('u1', '2026-06-10'));
    await waitFor(() => expect(result.current.completedCount).toBe(1));

    await act(async () => {
      await result.current.toggleHabit(HABITS[0].key);
    });
    expect(result.current.habits[HABITS[0].key]).toBe(false);
    expect(result.current.completedCount).toBe(0);
  });
});

describe('useDailyLog - saveLog', () => {
  it('updates local log state on a successful save', async () => {
    const { result } = renderHook(() => useDailyLog('u1', '2026-06-10'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const saved: DailyLog = {
      id: 'd1',
      user_id: 'u1',
      log_date: '2026-06-10',
      weight_kg: 68,
      waist_cm: null,
      body_fat_pct: null,
      steps: null,
      water_ml: null,
      protein_g: null,
      cycle_day: null,
      notes: null,
      created_at: '',
      updated_at: '',
    };
    responses['daily_logs:upsert'] = { data: saved, error: null };

    await act(async () => {
      const res = await result.current.saveLog({ weight_kg: 68 });
      expect(res?.error).toBeNull();
    });

    expect(result.current.log?.weight_kg).toBe(68);
  });

  it('returns the error and leaves log untouched on failure', async () => {
    const { result } = renderHook(() => useDailyLog('u1', '2026-06-10'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    responses['daily_logs:upsert'] = { data: null, error: { message: 'denied' } };

    await act(async () => {
      const res = await result.current.saveLog({ weight_kg: 99 });
      expect(res?.error).toEqual({ message: 'denied' });
    });

    expect(result.current.log).toBeNull();
  });
});
