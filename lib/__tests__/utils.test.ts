import {
  formatDate,
  todayStr,
  parseDate,
  subtractDays,
  getDatesRange,
  formatDisplayDate,
  formatFullDate,
  calcCycleDay,
  shiftDate,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
  parseNumericInput,
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

describe('shiftDate', () => {
  it('shifts forward and backward', () => {
    expect(shiftDate('2026-06-10', -1)).toBe('2026-06-09');
    expect(shiftDate('2026-06-10', 1)).toBe('2026-06-11');
  });

  it('crosses month and year boundaries', () => {
    expect(shiftDate('2026-06-01', -1)).toBe('2026-05-31');
    expect(shiftDate('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('sanitizeDecimalInput', () => {
  it('passes through a plain decimal', () => {
    expect(sanitizeDecimalInput('68.5')).toBe('68.5');
  });

  it('keeps a trailing dot so the fractional part can still be typed', () => {
    // This is the core fix: "68." must survive a keystroke.
    expect(sanitizeDecimalInput('68.')).toBe('68.');
  });

  it('strips non-numeric characters', () => {
    expect(sanitizeDecimalInput('12abc')).toBe('12');
    expect(sanitizeDecimalInput('1a.2b')).toBe('1.2');
  });

  it('collapses multiple dots to a single decimal point', () => {
    expect(sanitizeDecimalInput('1.2.3')).toBe('1.23');
    expect(sanitizeDecimalInput('..5')).toBe('.5');
  });

  it('returns an empty string for fully invalid input', () => {
    expect(sanitizeDecimalInput('abc')).toBe('');
  });
});

describe('sanitizeIntegerInput', () => {
  it('keeps digits only', () => {
    expect(sanitizeIntegerInput('8500')).toBe('8500');
    expect(sanitizeIntegerInput('85.5')).toBe('855');
    expect(sanitizeIntegerInput('12abc')).toBe('12');
  });
});

describe('parseNumericInput', () => {
  it('parses a valid number', () => {
    expect(parseNumericInput('68.5')).toBe(68.5);
    expect(parseNumericInput('0')).toBe(0);
  });

  it('returns null for empty or dot-only input', () => {
    expect(parseNumericInput('')).toBeNull();
    expect(parseNumericInput('   ')).toBeNull();
    expect(parseNumericInput('.')).toBeNull();
  });

  it('returns null for non-numeric junk rather than silently truncating', () => {
    // parseFloat('12abc') would return 12; we want null instead.
    expect(parseNumericInput('12abc')).toBeNull();
    expect(parseNumericInput('abc')).toBeNull();
  });

  it('tolerates a trailing dot', () => {
    expect(parseNumericInput('68.')).toBe(68);
  });
});
