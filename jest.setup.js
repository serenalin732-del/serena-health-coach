/* eslint-disable no-undef */
// Provide env vars so lib/supabase.ts can construct a client without throwing.
process.env.EXPO_PUBLIC_SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';

// React 19 / react-test-renderer requires this flag to enable act() support.
global.IS_REACT_ACT_ENVIRONMENT = true;

// @testing-library/react-native v12.4+ extends Jest matchers automatically
// on import; no manual extend-expect require is needed.
