import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTrends } from '../useTrends';

// useTrends runs three queries in parallel via Promise.all, each shaped:
//   from(table).select(...).eq(...).gte(...)[.order(...)]
// The terminal call differs per table:
//   daily_logs / sleep_logs end with .order()
//   habit_completions ends with .gte()  (awaited directly)
// We route resolved values per-table via the table name passed to from().
const responses: Record<string, { data: unknown }> = {};

function makeQuery(table: string) {
  const result = Promise.resolve(responses[table] ?? { data: [] });
  const chain: any = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    // gte must be awaitable (habit_completions) AND chainable (.order)
    gte: jest.fn(() => {
      const thenable: any = chain;
      return thenable;
    }),
    order: jest.fn(() => result),
    then: (...args: Parameters<Promise<unknown>['then']>) => result.then(...args),
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

describe('useTrends', () => {
  it('does not fetch when userId is undefined', () => {
    renderHook(() => useTrends(undefined));
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('defaults to the 30d range', async () => {
    const { result } = renderHook(() => useTrends('u1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.range).toBe('30d');
  });

  it('maps daily_logs rows into the per-metric series', async () => {
    responses['daily_logs'] = {
      data: [
        { log_date: '2026-06-01', weight_kg: 70, waist_cm: 80, body_fat_pct: 25, protein_g: 90 },
        { log_date: '2026-06-02', weight_kg: 69.5, waist_cm: null, body_fat_pct: 24, protein_g: null },
      ],
    };
    const { result } = renderHook(() => useTrends('u1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.weightData).toEqual([
      { date: '2026-06-01', value: 70 },
      { date: '2026-06-02', value: 69.5 },
    ]);
    expect(result.current.waistData).toEqual([
      { date: '2026-06-01', value: 80 },
      { date: '2026-06-02', value: null },
    ]);
    expect(result.current.proteinData[1]).toEqual({ date: '2026-06-02', value: null });
  });

  it('maps sleep_logs hours into the sleep series', async () => {
    responses['sleep_logs'] = {
      data: [
        { log_date: '2026-06-01', hours: 7.5 },
        { log_date: '2026-06-02', hours: 6 },
      ],
    };
    const { result } = renderHook(() => useTrends('u1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sleepData).toEqual([
      { date: '2026-06-01', value: 7.5 },
      { date: '2026-06-02', value: 6 },
    ]);
  });

  describe('habit completion aggregation', () => {
    it('computes a per-day completion percentage', async () => {
      responses['habit_completions'] = {
        data: [
          // 2026-06-01: 2 of 3 completed -> 67%
          { log_date: '2026-06-01', completed: true },
          { log_date: '2026-06-01', completed: true },
          { log_date: '2026-06-01', completed: false },
          // 2026-06-02: 1 of 2 completed -> 50%
          { log_date: '2026-06-02', completed: true },
          { log_date: '2026-06-02', completed: false },
        ],
      };
      const { result } = renderHook(() => useTrends('u1'));
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.habitData).toEqual([
        { date: '2026-06-01', value: 67 },
        { date: '2026-06-02', value: 50 },
      ]);
    });

    it('sorts the habit series by date ascending regardless of input order', async () => {
      responses['habit_completions'] = {
        data: [
          { log_date: '2026-06-03', completed: true },
          { log_date: '2026-06-01', completed: true },
          { log_date: '2026-06-02', completed: false },
        ],
      };
      const { result } = renderHook(() => useTrends('u1'));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.habitData.map(d => d.date)).toEqual([
        '2026-06-01',
        '2026-06-02',
        '2026-06-03',
      ]);
    });

    it('reports 0% for a day where nothing is completed', async () => {
      responses['habit_completions'] = {
        data: [
          { log_date: '2026-06-01', completed: false },
          { log_date: '2026-06-01', completed: false },
        ],
      };
      const { result } = renderHook(() => useTrends('u1'));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.habitData).toEqual([{ date: '2026-06-01', value: 0 }]);
    });
  });

  it('refetches when the range changes', async () => {
    const { result } = renderHook(() => useTrends('u1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsAfterInitial = mockFrom.mock.calls.length;

    await act(async () => {
      result.current.setRange('7d');
    });
    await waitFor(() => expect(result.current.range).toBe('7d'));
    expect(mockFrom.mock.calls.length).toBeGreaterThan(callsAfterInitial);
  });
});
