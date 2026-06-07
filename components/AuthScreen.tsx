import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '@/lib/theme';
import { InputField, PrimaryButton } from '@/components/Inputs';
import { useAuth } from '@/hooks/useAuth';

export default function AuthScreen() {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    if (mode === 'signup' && !fullName) { setError('Please enter your name.'); return; }
    setLoading(true);
    const { error: err } = mode === 'signin'
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password, fullName);
    if (err) setError(err.message);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Image
              source={{ uri: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400' }}
              style={styles.heroImg}
            />
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>Serena</Text>
              <Text style={styles.heroSubtitle}>Your personal health coach</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.heading}>{mode === 'signin' ? 'Welcome back' : 'Create account'}</Text>
            <Text style={styles.subheading}>
              {mode === 'signin' ? 'Sign in to continue your journey' : 'Start your wellness journey today'}
            </Text>

            {mode === 'signup' && (
              <InputField
                label="Full Name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your name"
                autoCapitalize="words"
              />
            )}
            <InputField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="hello@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <InputField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton label={mode === 'signin' ? 'Sign In' : 'Create Account'} onPress={handleSubmit} loading={loading} style={styles.btn} />

            <TouchableOpacity onPress={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(''); }}>
              <Text style={styles.toggle}>
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <Text style={styles.toggleAction}>{mode === 'signin' ? 'Sign Up' : 'Sign In'}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  kav: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: {
    height: 260,
    position: 'relative',
  },
  heroImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(180, 100, 80, 0.35)',
  },
  heroContent: {
    position: 'absolute',
    bottom: SPACING.xl,
    left: SPACING.lg,
  },
  heroTitle: {
    fontFamily: FONTS.bold,
    fontSize: 38,
    color: COLORS.white,
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 4,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    marginTop: -RADIUS.xxl,
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    ...SHADOW.cardMd,
  },
  heading: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.charcoal,
    marginBottom: 4,
  },
  subheading: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.charcoalMuted,
    marginBottom: SPACING.lg,
  },
  error: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.error,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  btn: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  toggle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.charcoalMuted,
    textAlign: 'center',
  },
  toggleAction: {
    fontFamily: FONTS.semiBold,
    color: COLORS.rosePrimary,
  },
});
