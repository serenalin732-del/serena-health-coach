import { renderHook, act } from '@testing-library/react-native';
import { useMealAnalysis } from '../useMealAnalysis';

const mockInvoke = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));

beforeEach(() => jest.clearAllMocks());

describe('useMealAnalysis', () => {
  it('returns the estimate and passes the input as the body', async () => {
    const estimate = { food_name: 'Oatmeal', calories: 300, protein_g: 10, carbs_g: 54, fat_g: 6, note: 'one bowl' };
    mockInvoke.mockResolvedValue({ data: estimate, error: null });

    const { result } = renderHook(() => useMealAnalysis());
    let out;
    await act(async () => {
      out = await result.current.analyze({ meal_type: 'breakfast', description: 'oatmeal', grams: 250 });
    });

    expect(mockInvoke).toHaveBeenCalledWith('analyze-meal', {
      body: { meal_type: 'breakfast', description: 'oatmeal', grams: 250 },
    });
    expect(out).toEqual(estimate);
    expect(result.current.error).toBeNull();
  });

  it('surfaces a friendly error when the invoke fails', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const { result } = renderHook(() => useMealAnalysis());
    let out;
    await act(async () => {
      out = await result.current.analyze({ meal_type: 'lunch', description: 'x' });
    });
    expect(out).toBeNull();
    expect(result.current.error).toMatch(/try again/i);
  });

  it('reports the not-configured state', async () => {
    mockInvoke.mockResolvedValue({ data: { code: 'not_configured' }, error: null });
    const { result } = renderHook(() => useMealAnalysis());
    await act(async () => {
      await result.current.analyze({ meal_type: 'lunch', description: 'x' });
    });
    expect(result.current.error).toMatch(/not set up/i);
  });

  it('passes through a function-body error message', async () => {
    mockInvoke.mockResolvedValue({ data: { error: 'Add a description or a photo first.' }, error: null });
    const { result } = renderHook(() => useMealAnalysis());
    await act(async () => {
      await result.current.analyze({ meal_type: 'lunch' });
    });
    expect(result.current.error).toBe('Add a description or a photo first.');
  });
});
