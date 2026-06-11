import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useAuth } from '@/hooks/useAuth';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { COLORS } from '@/lib/theme';
import { registerServiceWorker } from '@/lib/push';
import { I18nProvider } from '@/lib/i18n';
import { PrefsProvider } from '@/lib/prefs';

SplashScreen.preventAutoHideAsync();

// Shown by expo-router when a render error escapes — a readable message beats a
// blank white screen.
export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorBody}>{error.message}</Text>
    </View>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Register the Web Push service worker (no-op off web / unsupported).
  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (loading || (!fontsLoaded && !fontError)) return;
    const inTabsGroup = segments[0] === '(tabs)';
    if (!session && inTabsGroup) {
      router.replace('/auth');
    } else if (session && !inTabsGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, fontsLoaded, fontError, segments]);

  if ((!fontsLoaded && !fontError) || loading) {
    // Show a spinner rather than null so a slow/stuck load reads as "loading"
    // instead of a blank screen.
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.rosePrimary} />
      </View>
    );
  }

  return (
    <I18nProvider>
      <PrefsProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="dark" />
      </PrefsProvider>
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.cream,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.charcoal,
    marginBottom: 8,
  },
  errorBody: {
    fontSize: 13,
    color: COLORS.charcoalMuted,
    textAlign: 'center',
  },
});
