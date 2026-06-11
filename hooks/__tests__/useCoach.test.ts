import { renderHook, act } from '@testing-library/react-native';
import { useCoach } from '../useCoach';

const mockInvoke = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useCoach', () => {
  it('starts idle with no coaching', () => {
    const { result } = renderHook(() => useCoach());
    expect(result.current.coaching).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.configured).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('stores the coaching text on success', async () => {
    mockInvoke.mockResolvedValue({ data: { coaching: 'Nice work — protein is up.' }, error: null });
    const { result } = renderHook(() => useCoach());
    await act(async () => {
      await result.current.generate();
    });
    expect(mockInvoke).toHaveBeenCalledWith('coach', { body: { lang: 'en' } });
    expect(result.current.coaching).toBe('Nice work — protein is up.');
    expect(result.current.loading).toBe(false);
  });

  it('flips to not-configured when the function reports it', async () => {
    mockInvoke.mockResolvedValue({ data: { code: 'not_configured' }, error: null });
    const { result } = renderHook(() => useCoach());
    await act(async () => {
      await result.current.generate();
    });
    expect(result.current.configured).toBe(false);
    expect(result.current.coaching).toBeNull();
  });

  it('surfaces a friendly error when the invoke fails', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const { result } = renderHook(() => useCoach());
    await act(async () => {
      await result.current.generate();
    });
    expect(result.current.error).toMatch(/try again/i);
    expect(result.current.coaching).toBeNull();
  });

  it('surfaces an error returned in the function body', async () => {
    mockInvoke.mockResolvedValue({ data: { error: 'rate limited' }, error: null });
    const { result } = renderHook(() => useCoach());
    await act(async () => {
      await result.current.generate();
    });
    expect(result.current.error).toBe('rate limited');
  });
});
