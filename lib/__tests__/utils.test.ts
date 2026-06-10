import {
  formatDate,
  todayStr,
  parseDate,
  subtractDays,
  getDatesRange,
  formatDisplayDate,
  formatFullDate,
  calcCycleDay,
} from '../utils';

describe('formatDate', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('zero-pads single-digit months and days', () => {
    expect(formatDate(new Date(2026, 8, 9))).toBe('2026-09-09');
  });

  it('handles end-of-year dates', () => {
    expect(formatDate(new Date(2025, 11, 31))).toBe('2025-12-31');
  });
});

describe('parseDate', () => {
  it('parses a YYYY-MM-DD string to a local Date', () => {
    const d = parseDate('2026-03-15');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2); // March is month index 2
    expect(d.getDate()).toBe(15);
  });

  it('round-trips with formatDate', () => {
    expect(formatDate(parseDate('2024-02-29'))).toBe('2024-02-29');
  });
});

describe('todayStr', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 5, 10, 13, 30));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns today's date formatted", () => {
    expect(todayStr()).toBe('2026-06-10');
  });
});

describe('subtractDays', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 5, 10, 8, 0));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('subtracts the given number of days from today', () => {
    expect(subtractDays(7)).toBe('2026-06-03');
  });

  it('returns today when subtracting zero', () => {
    expect(subtractDays(0)).toBe('2026-06-10');
  });

  it('rolls back across a month boundary', () => {
    expect(subtractDays(15)).toBe('2026-05-26');
  });
});

describe('getDatesRange', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 5, 10, 8, 0));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns exactly `days` entries', () => {
    expect(getDatesRange(7)).toHaveLength(7);
  });

  it('returns dates in ascending order ending today', () => {
    expect(getDatesRange(3)).toEqual(['2026-06-08', '2026-06-09', '2026-06-10']);
  });

  it('returns an empty array for zero days', () => {
    expect(getDatesRange(0)).toEqual([]);
  });
});

describe('formatDisplayDate', () => {
  it('formats as short month + day', () => {
    expect(formatDisplayDate('2026-06-10')).toBe('Jun 10');
  });
});

describe('formatFullDate', () => {
  it('formats as weekday, full month, and day', () => {
    // 2026-06-10 is a Wednesday
    expect(formatFullDate('2026-06-10')).toBe('Wednesday, June 10');
  });
});

describe('calcCycleDay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 5, 10, 13, 30));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns 1 on the period start day', () => {
    expect(calcCycleDay('2026-06-10')).toBe(1);
  });

  it('counts days inclusively from the start', () => {
    // 5 days after start = cycle day 6
    expect(calcCycleDay('2026-06-05')).toBe(6);
  });

  it('clamps future start dates to a minimum of 1', () => {
    expect(calcCycleDay('2026-06-20')).toBe(1);
  });

  it('handles starts that cross a month boundary', () => {
    // May 31 -> Jun 10 is 10 days elapsed = cycle day 11
    expect(calcCycleDay('2026-05-31')).toBe(11);
  });
});
