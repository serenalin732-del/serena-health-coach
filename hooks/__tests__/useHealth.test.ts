import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useSleepLog, useCycleLogs, useLabResults, useCgmLog } from '../useHealth';
import type { CycleLog, LabResult } from '@/lib/types';

// A chainable, awaitable Supabase mock. Every builder method (select, eq, gte,
// order, limit, maybeSingle, single, insert, upsert, ...) returns the same
// thenable proxy, so awaiting at ANY terminal call resolves to a configured
// value. Reads resolve `responses[table]`; writes (insert/upsert) resolve
// `responses[`${table}:write`]`.
const responses: Record<string, { data: unknown; error?: unknown }> = {};
const fromCalls: string[] = [];

function makeProxy(table: string, op: 'read' | 'write'): any {
  return new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') {
        const key = op === 'write' ? `${table}:write` : table;
        const value = responses[key] ?? { data: null, error: null };
        const p = Promise.resolve(value);
        return p.then.bind(p);
      }
      if (typeof prop === 'symbol') return undefined;
      return (..._args: unknown[]) => {
        const nextOp =
          prop === 'insert' || prop === 'upsert' || prop === 'update' || prop === 'delete'
            ? 'write'
            : op;
        return makeProxy(table, nextOp as 'read' | 'write');
      };
    },
  });
}

const mockFrom = jest.fn((table: string) => {
  fromCalls.push(table);
  return makeProxy(table, 'read');
});

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

beforeEach(() => {
  jest.clearAllMocks();
  fromCalls.length = 0;
  for (const k of Object.keys(responses)) delete responses[k];
});

describe('useSleepLog', () => {
  it('does not query without a userId', () => {
    renderHook(() => useSleepLog(undefined, '2026-06-10'));
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('loads the sleep log for the date', async () => {
    responses['sleep_logs'] = { data: { id: 's1', hours: 7.5, score: 80 } };
    const { result } = renderHook(() => useSleepLog('u1', '2026-06-10'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.log).toEqual({ id: 's1', hours: 7.5, score: 80 });
    expect(fromCalls).toContain('sleep_logs');
  });

  it('updates local state after a successful save', async () => {
    const { result } = renderHook(() => useSleepLog('u1', '2026-06-10'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    responses['sleep_logs:write'] = { data: { id: 's1', hours: 8 }, error: null };
    await act(async () => {
      const res = await result.current.save({ hours: 8 });
      expect(res?.error).toBeNull();
    });
    expect(result.current.log).toEqual({ id: 's1', hours: 8 });
  });

  it('returns the error and keeps state on a failed save', async () => {
    const { result } = renderHook(() => useSleepLog('u1', '2026-06-10'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    responses['sleep_logs:write'] = { data: null, error: { message: 'no' } };
    await act(async () => {
      const res = await result.current.save({ hours: 8 });
      expect(res?.error).toEqual({ message: 'no' });
    });
    expect(result.current.log).toBeNull();
  });
});

describe('useCycleLogs', () => {
  function cycle(partial: Partial<CycleLog>): CycleLog {
    return {
      id: 'c1',
      user_id: 'u1',
      period_start: '2026-06-01',
      cycle_length_days: 28,
      symptoms: null,
      notes: null,
      created_at: '',
      updated_at: '',
      ...partial,
    };
  }

  it('loads cycle logs and exposes the most recent as `latest`', async () => {
    responses['cycle_logs'] = {
      data: [cycle({ id: 'newest', period_start: '2026-06-01' }), cycle({ id: 'older', period_start: '2026-05-01' })],
    };
    const { result } = renderHook(() => useCycleLogs('u1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.logs).toHaveLength(2);
    expect(result.current.latest?.id).toBe('newest');
  });

  it('exposes a null latest when there are no logs', async () => {
    responses['cycle_logs'] = { data: [] };
    const { result } = renderHook(() => useCycleLogs('u1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.latest).toBeNull();
  });

  it('prepends a newly added log to the list', async () => {
    responses['cycle_logs'] = { data: [cycle({ id: 'existing' })] };
    const { result } = renderHook(() => useCycleLogs('u1'));
    await waitFor(() => expect(result.current.logs).toHaveLength(1));

    responses['cycle_logs:write'] = { data: cycle({ id: 'added', period_start: '2026-06-29' }), error: null };
    await act(async () => {
      await result.current.addLog({
        period_start: '2026-06-29',
        cycle_length_days: 28,
        symptoms: null,
        notes: null,
      });
    });
    expect(result.current.logs[0].id).toBe('added');
    expect(result.current.latest?.id).toBe('added');
  });
});

describe('useLabResults', () => {
  function lab(partial: Partial<LabResult>): LabResult {
    return {
      id: 'l1',
      user_id: 'u1',
      test_date: '2026-06-01',
      cortisol: null,
      vitamin_d: null,
      progesterone: null,
      glucose: null,
      hba1c: null,
      cholesterol: null,
      notes: null,
      created_at: '',
      updated_at: '',
      ...partial,
    };
  }

  it('loads lab results', async () => {
    responses['lab_results'] = { data: [lab({ id: 'a' }), lab({ id: 'b' })] };
    const { result } = renderHook(() => useLabResults('u1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.results).toHaveLength(2);
  });

  it('prepends an added result', async () => {
    responses['lab_results'] = { data: [] };
    const { result } = renderHook(() => useLabResults('u1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    responses['lab_results:write'] = { data: lab({ id: 'new', vitamin_d: 40 }), error: null };
    await act(async () => {
      await result.current.addResult({
        test_date: '2026-06-09',
        cortisol: null,
        vitamin_d: 40,
        progesterone: null,
        glucose: null,
        hba1c: null,
        cholesterol: null,
        notes: null,
      });
    });
    expect(result.current.results[0].id).toBe('new');
  });
});

describe('useCgmLog', () => {
  it('loads the CGM log for the date', async () => {
    responses['cgm_logs'] = { data: { id: 'g1', daily_avg_glucose: 95, time_in_range_pct: 80 } };
    const { result } = renderHook(() => useCgmLog('u1', '2026-06-10'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.log).toEqual({ id: 'g1', daily_avg_glucose: 95, time_in_range_pct: 80 });
  });

  it('updates state after a successful save', async () => {
    const { result } = renderHook(() => useCgmLog('u1', '2026-06-10'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    responses['cgm_logs:write'] = { data: { id: 'g1', daily_avg_glucose: 100 }, error: null };
    await act(async () => {
      await result.current.save({ daily_avg_glucose: 100 });
    });
    expect(result.current.log).toEqual({ id: 'g1', daily_avg_glucose: 100 });
  });
});
