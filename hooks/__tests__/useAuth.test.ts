import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuth } from '../useAuth';

const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();
const mockUpsert = jest.fn();
const mockFrom = jest.fn();
const unsubscribe = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (cb: unknown) => mockOnAuthStateChange(cb),
      signInWithPassword: (a: unknown) => mockSignInWithPassword(a),
      signUp: (a: unknown) => mockSignUp(a),
      signOut: () => mockSignOut(),
    },
    from: (table: string) => mockFrom(table),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: { session: null } });
  mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });
  mockFrom.mockReturnValue({ upsert: (a: unknown) => mockUpsert(a) });
  mockUpsert.mockResolvedValue({ error: null });
});

describe('useAuth - session bootstrap', () => {
  it('starts loading, then settles with no user when there is no session', async () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('populates session and user from an existing session', async () => {
    const session = { user: { id: 'u1', email: 'a@b.com' } };
    mockGetSession.mockResolvedValue({ data: { session } });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual({ id: 'u1', email: 'a@b.com' });
  });

  it('settles out of loading even if getSession rejects', async () => {
    mockGetSession.mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('subscribes to auth changes and unsubscribes on unmount', async () => {
    const { unmount, result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('updates state when the auth listener fires', async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const listener = mockOnAuthStateChange.mock.calls[0][0] as (e: string, s: unknown) => void;
    const session = { user: { id: 'u2', email: 'c@d.com' } };
    act(() => listener('SIGNED_IN', session));

    expect(result.current.user).toEqual({ id: 'u2', email: 'c@d.com' });
    expect(result.current.session).toBe(session);
  });
});

describe('useAuth - signInWithEmail', () => {
  it('calls signInWithPassword and surfaces the result', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let res: { error: unknown } | undefined;
    await act(async () => {
      res = await result.current.signInWithEmail('a@b.com', 'pw');
    });

    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw' });
    expect(res?.error).toBeNull();
  });

  it('propagates a sign-in error', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'bad creds' } });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let res: { error: unknown } | undefined;
    await act(async () => {
      res = await result.current.signInWithEmail('a@b.com', 'wrong');
    });
    expect(res?.error).toEqual({ message: 'bad creds' });
  });
});

describe('useAuth - signUpWithEmail', () => {
  it('creates a user_profiles row on successful sign-up', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'new-user' } }, error: null });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signUpWithEmail('e@f.com', 'pw', 'Eve');
    });

    expect(mockSignUp).toHaveBeenCalledWith({ email: 'e@f.com', password: 'pw' });
    expect(mockFrom).toHaveBeenCalledWith('user_profiles');
    expect(mockUpsert).toHaveBeenCalledWith({ id: 'new-user', email: 'e@f.com', full_name: 'Eve' });
  });

  it('does not create a profile when sign-up errors', async () => {
    mockSignUp.mockResolvedValue({ data: { user: null }, error: { message: 'exists' } });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let res: { error: unknown } | undefined;
    await act(async () => {
      res = await result.current.signUpWithEmail('e@f.com', 'pw', 'Eve');
    });

    expect(mockUpsert).not.toHaveBeenCalled();
    expect(res?.error).toEqual({ message: 'exists' });
  });
});

describe('useAuth - signOut', () => {
  it('calls supabase auth signOut', async () => {
    mockSignOut.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
