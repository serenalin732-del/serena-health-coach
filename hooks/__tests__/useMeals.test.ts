import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useMeals } from '../useMeals';
import type { MealLog } from '@/lib/types';

// --- Supabase mock -----------------------------------------------------------
// useMeals issues:
//   select: from().select().eq().eq().order()  -> resolves { data }
//   insert: from().insert().select().single()  -> resolves { data, error }
//   delete: from().delete().eq()               -> resolves { error }
const mockOrder = jest.fn();
const mockSingle = jest.fn();
const mockDeleteEq = jest.fn();

const selectChain: any = {
  eq: jest.fn(() => selectChain),
  order: (...args: unknown[]) => mockOrder(...args),
};

const insertChain: any = {
  select: jest.fn(() => ({ single: () => mockSingle() })),
};

const mockFrom = jest.fn((_table: string): any => ({
  select: jest.fn(() => selectChain),
  insert: jest.fn(() => insertChain),
  delete: jest.fn(() => ({ eq: (...args: unknown[]) => mockDeleteEq(...args) })),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

function makeMeal(partial: Partial<MealLog>): MealLog {
  return {
    id: 'm1',
    user_id: 'u1',
    log_date: '2026-06-10',
    meal_type: 'breakfast',
    food_name: 'Eggs',
    grams: null,
    calories: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    healthy_fat_g: null,
    veg_servings: null,
    notes: null,
    created_at: '',
    updated_at: '',
    ...partial,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockOrder.mockResolvedValue({ data: [] });
});

describe('useMeals - fetching', () => {
  it('does not query when userId is undefined', async () => {
    renderHook(() => useMeals(undefined, '2026-06-10'));
    // The guard returns before any supabase call.
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('loads meals for the given user and date', async () => {
    const meals = [makeMeal({ id: 'a' }), makeMeal({ id: 'b', meal_type: 'lunch' })];
    mockOrder.mockResolvedValue({ data: meals });

    const { result } = renderHook(() => useMeals('u1', '2026-06-10'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.meals).toHaveLength(2);
    expect(mockFrom).toHaveBeenCalledWith('meal_logs');
  });

  it('falls back to an empty array when data is null', async () => {
    mockOrder.mockResolvedValue({ data: null });
    const { result } = renderHook(() => useMeals('u1', '2026-06-10'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.meals).toEqual([]);
  });
});

describe('useMeals - totals aggregation', () => {
  it('sums all macros across meals', async () => {
    mockOrder.mockResolvedValue({
      data: [
        makeMeal({ id: 'a', calories: 100, protein_g: 10, carbs_g: 5, fat_g: 2 }),
        makeMeal({ id: 'b', calories: 200, protein_g: 20, carbs_g: 15, fat_g: 8 }),
      ],
    });
    const { result } = renderHook(() => useMeals('u1', '2026-06-10'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.totals).toEqual({ calories: 300, protein: 30, carbs: 20, fat: 10, healthyFat: 0, veg: 0 });
  });

  it('treats null macro values as zero', async () => {
    mockOrder.mockResolvedValue({
      data: [
        makeMeal({ id: 'a', calories: 100, protein_g: null, carbs_g: null, fat_g: null }),
        makeMeal({ id: 'b', calories: null, protein_g: 20, carbs_g: null, fat_g: null }),
      ],
    });
    const { result } = renderHook(() => useMeals('u1', '2026-06-10'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.totals).toEqual({ calories: 100, protein: 20, carbs: 0, fat: 0, healthyFat: 0, veg: 0 });
  });

  it('returns all-zero totals for no meals', async () => {
    mockOrder.mockResolvedValue({ data: [] });
    const { result } = renderHook(() => useMeals('u1', '2026-06-10'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.totals).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0, healthyFat: 0, veg: 0 });
  });
});

describe('useMeals - byType grouping', () => {
  it('buckets meals by meal_type', async () => {
    mockOrder.mockResolvedValue({
      data: [
        makeMeal({ id: 'a', meal_type: 'breakfast' }),
        makeMeal({ id: 'b', meal_type: 'lunch' }),
        makeMeal({ id: 'c', meal_type: 'lunch' }),
        makeMeal({ id: 'd', meal_type: 'snack' }),
      ],
    });
    const { result } = renderHook(() => useMeals('u1', '2026-06-10'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.byType.breakfast).toHaveLength(1);
    expect(result.current.byType.lunch).toHaveLength(2);
    expect(result.current.byType.dinner).toHaveLength(0);
    expect(result.current.byType.snack).toHaveLength(1);
  });
});

describe('useMeals - mutations', () => {
  it('appends the inserted meal to local state on success', async () => {
    const { result } = renderHook(() => useMeals('u1', '2026-06-10'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const inserted = makeMeal({ id: 'new', food_name: 'Yogurt', calories: 150 });
    mockSingle.mockResolvedValue({ data: inserted, error: null });

    await act(async () => {
      await result.current.addMeal({
        log_date: '2026-06-10',
        meal_type: 'snack',
        food_name: 'Yogurt',
        grams: null,
        calories: 150,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
        healthy_fat_g: null,
        veg_servings: null,
        notes: null,
      });
    });

    expect(result.current.meals).toContainEqual(inserted);
  });

  it('does not mutate state when insert returns an error', async () => {
    const { result } = renderHook(() => useMeals('u1', '2026-06-10'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await act(async () => {
      const res = await result.current.addMeal({
        log_date: '2026-06-10',
        meal_type: 'snack',
        food_name: 'Yogurt',
        grams: null,
        calories: null,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
        healthy_fat_g: null,
        veg_servings: null,
        notes: null,
      });
      expect(res?.error).toEqual({ message: 'boom' });
    });

    expect(result.current.meals).toHaveLength(0);
  });

  it('removes a meal from local state on successful delete', async () => {
    mockOrder.mockResolvedValue({ data: [makeMeal({ id: 'x' }), makeMeal({ id: 'y' })] });
    const { result } = renderHook(() => useMeals('u1', '2026-06-10'));
    await waitFor(() => expect(result.current.meals).toHaveLength(2));

    mockDeleteEq.mockResolvedValue({ error: null });
    await act(async () => {
      await result.current.deleteMeal('x');
    });

    expect(result.current.meals.map(m => m.id)).toEqual(['y']);
  });

  it('keeps the meal when delete returns an error', async () => {
    mockOrder.mockResolvedValue({ data: [makeMeal({ id: 'x' })] });
    const { result } = renderHook(() => useMeals('u1', '2026-06-10'));
    await waitFor(() => expect(result.current.meals).toHaveLength(1));

    mockDeleteEq.mockResolvedValue({ error: { message: 'nope' } });
    await act(async () => {
      await result.current.deleteMeal('x');
    });

    expect(result.current.meals).toHaveLength(1);
  });
});
