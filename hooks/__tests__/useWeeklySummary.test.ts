import { computeWeeklySummary, EMPTY_WEEKLY_SUMMARY } from '../useWeeklySummary';

describe('computeWeeklySummary', () => {
  it('returns empty values for no data', () => {
    expect(computeWeeklySummary([], [])).toEqual(EMPTY_WEEKLY_SUMMARY);
  });

  it('computes weight delta from earliest to latest logged value', () => {
    const daily = [
      { log_date: '2026-06-05', weight_kg: 70, waist_cm: null },
      { log_date: '2026-06-08', weight_kg: 69.4, waist_cm: null },
    ];
    const s = computeWeeklySummary(daily, []);
    expect(s.weightDelta).toBe(-0.6);
    expect(s.latestWeight).toBe(69.4);
  });

  it('ignores input order when picking earliest/latest', () => {
    const daily = [
      { log_date: '2026-06-08', weight_kg: 69, waist_cm: null },
      { log_date: '2026-06-05', weight_kg: 70, waist_cm: null },
    ];
    expect(computeWeeklySummary(daily, []).weightDelta).toBe(-1);
  });

  it('skips null metric values when computing deltas', () => {
    const daily = [
      { log_date: '2026-06-05', weight_kg: null, waist_cm: 80 },
      { log_date: '2026-06-06', weight_kg: 68, waist_cm: null },
      { log_date: '2026-06-08', weight_kg: 67.5, waist_cm: 79 },
    ];
    const s = computeWeeklySummary(daily, []);
    expect(s.weightDelta).toBe(-0.5); // 67.5 - 68
    expect(s.waistDelta).toBe(-1); // 79 - 80
  });

  it('returns a null delta but a latest value when only one point exists', () => {
    const daily = [{ log_date: '2026-06-08', weight_kg: 68, waist_cm: null }];
    const s = computeWeeklySummary(daily, []);
    expect(s.weightDelta).toBeNull();
    expect(s.latestWeight).toBe(68);
  });

  it('averages per-day habit completion across days with data', () => {
    const habits = [
      // day 1: 2/4 = 50%
      { log_date: '2026-06-07', completed: true },
      { log_date: '2026-06-07', completed: true },
      { log_date: '2026-06-07', completed: false },
      { log_date: '2026-06-07', completed: false },
      // day 2: 1/2 = 50%
      { log_date: '2026-06-08', completed: true },
      { log_date: '2026-06-08', completed: false },
    ];
    expect(computeWeeklySummary([], habits).avgHabitPct).toBe(50);
  });

  it('counts distinct days that have any logged data', () => {
    const daily = [
      { log_date: '2026-06-05', weight_kg: 70, waist_cm: null },
      { log_date: '2026-06-06', weight_kg: null, waist_cm: null }, // no metric -> not counted
    ];
    const habits = [
      { log_date: '2026-06-06', completed: true },
      { log_date: '2026-06-08', completed: false },
    ];
    // 2026-06-05 (weight), 2026-06-06 (habit), 2026-06-08 (habit) = 3 distinct days
    expect(computeWeeklySummary(daily, habits).daysLogged).toBe(3);
  });
});
