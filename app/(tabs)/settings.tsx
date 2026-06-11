import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  LogOut,
  Download,
  Upload,
  Shield,
  ChevronRight,
  Moon,
  Sun,
  Utensils,
  Bell,
  Mail,
  Target,
  Heart,
  Percent,
  Footprints,
  Droplets,
  Dumbbell,
  Star,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '@/lib/theme';
import { SectionCard } from '@/components/Cards';
import { ModalSheet } from '@/components/UI';
import { InputField, PrimaryButton, Chip } from '@/components/Inputs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useReminders, type ReminderKey } from '@/hooks/useReminders';
import { useI18n } from '@/lib/i18n';
import { usePrefs } from '@/lib/prefs';
import { sanitizeDecimalInput, parseNumericInput } from '@/lib/utils';
import type { UserProfile } from '@/lib/types';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const userId = user?.id ?? '';
  const onSignOut = signOut;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: '', height_cm: '' });
  const [saving, setSaving] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [goalsForm, setGoalsForm] = useState({ target_weight_kg: '', target_waist_cm: '', goal_focus: '' });
  const [savingGoals, setSavingGoals] = useState(false);
  const reminders = useReminders(userId);
  const { t, lang, setLang } = useI18n();
  const { prefs, setPref } = usePrefs();

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data as UserProfile | null);
  }, [userId]);

  // Refetch whenever the tab regains focus, so the screen always shows what's
  // actually saved in the database.
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  const toggleReminder = (key: ReminderKey) => reminders.toggle(key);

  const togglePush = async (enabled: boolean) => {
    const result = await reminders.setPushEnabled(enabled);
    if (result === 'denied') {
      Alert.alert(t('Notifications blocked'), t('Enable notifications for this site in your browser settings, then try again.'));
    } else if (result === 'unsupported') {
      Alert.alert(t('Not supported here'), t('Open the app in a browser (and add it to your Home Screen on iOS) to enable push notifications.'));
    } else if (result === 'misconfigured') {
      Alert.alert(t('Almost there'), t('Push is not configured yet (missing VAPID key). Email reminders still work.'));
    } else if (result === 'error') {
      Alert.alert(t('Something went wrong'), t('Could not enable push notifications. Please try again.'));
    }
  };

  const toggleEmail = (enabled: boolean) =>
    reminders.setEmailReminders(enabled, profile?.email ?? null);

  const openProfileEdit = () => {
    setProfileForm({ full_name: profile?.full_name ?? '', height_cm: profile?.height_cm ? String(profile.height_cm) : '' });
    setShowProfileEdit(true);
  };

  const saveProfile = async () => {
    if (!userId) {
      Alert.alert(t('Not signed in'), t('Please sign in again and retry.'));
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(
        {
          id: userId,
          email: profile?.email ?? user?.email ?? null,
          full_name: profileForm.full_name.trim() || null,
          height_cm: parseNumericInput(profileForm.height_cm),
        },
        { onConflict: 'id' }
      )
      .select()
      .maybeSingle();
    setSaving(false);
    if (error) {
      // Surface the failure instead of silently dropping the change.
      Alert.alert(t('Could not save profile'), error.message);
      return;
    }
    if (data) setProfile(data as UserProfile);
    setShowProfileEdit(false);
  };

  const openGoals = () => {
    setGoalsForm({
      target_weight_kg: reminders.settings.target_weight_kg != null ? String(reminders.settings.target_weight_kg) : '',
      target_waist_cm: reminders.settings.target_waist_cm != null ? String(reminders.settings.target_waist_cm) : '',
      goal_focus: reminders.settings.goal_focus ?? '',
    });
    setShowGoals(true);
  };

  const saveGoals = async () => {
    setSavingGoals(true);
    const error = await reminders.save({
      target_weight_kg: parseNumericInput(goalsForm.target_weight_kg),
      target_waist_cm: parseNumericInput(goalsForm.target_waist_cm),
      goal_focus: goalsForm.goal_focus.trim() || null,
    });
    setSavingGoals(false);
    if (error) {
      Alert.alert(t('Could not save goals'), error.message);
      return;
    }
    setShowGoals(false);
  };

  const goalSummary =
    [
      reminders.settings.target_weight_kg != null ? `${reminders.settings.target_weight_kg} kg` : null,
      reminders.settings.target_waist_cm != null ? `${reminders.settings.target_waist_cm} cm waist` : null,
      reminders.settings.goal_focus || null,
    ]
      .filter(Boolean)
      .join(' · ') || t('Tell your AI coach what you are aiming for');

  const handleSignOut = () => {
    Alert.alert(t('Sign Out'), t('Are you sure you want to sign out?'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Sign Out'), style: 'destructive', onPress: onSignOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>{t('Settings')}</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(profile?.full_name ?? 'S').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.full_name ?? 'User'}</Text>
            <Text style={styles.profileEmail}>{profile?.email ?? ''}</Text>
          </View>
          <TouchableOpacity onPress={openProfileEdit} style={styles.editProfileBtn}>
            <Text style={styles.editProfileTxt}>{t('Edit')}</Text>
          </TouchableOpacity>
        </View>

        {/* Goals */}
        <SectionCard title={t('Goals')}>
          <SettingsRow
            icon={<Target size={18} color={COLORS.rosePrimary} />}
            label={t('My Goals')}
            sublabel={goalSummary}
            onPress={openGoals}
          />
        </SectionCard>

        {/* Language */}
        <SectionCard title={t('Language')}>
          <View style={styles.langRow}>
            <Chip label="English" selected={lang === 'en'} onPress={() => setLang('en')} />
            <Chip label="中文" selected={lang === 'zh'} onPress={() => setLang('zh')} />
          </View>
        </SectionCard>

        {/* Dashboard cards (per-device) */}
        <SectionCard title={t('Dashboard Cards')}>
          <Text style={styles.sectionHint}>{t('Choose what shows on your dashboard')}</Text>
          <ReminderRow
            icon={<Heart size={18} color={COLORS.roseBeige} />}
            label={t('Cycle tracking')}
            sublabel={t('Shows the cycle card and Health section')}
            value={prefs.cycle}
            onToggle={() => setPref('cycle', !prefs.cycle)}
            color={COLORS.roseBeigeLight}
          />
          <ReminderRow
            icon={<Percent size={18} color={COLORS.warning} />}
            label={t('Body Fat')}
            sublabel=""
            value={prefs.body_fat}
            onToggle={() => setPref('body_fat', !prefs.body_fat)}
            color={COLORS.warningLight}
          />
          <ReminderRow
            icon={<Dumbbell size={18} color={COLORS.sageDark} />}
            label={t('Protein')}
            sublabel=""
            value={prefs.protein}
            onToggle={() => setPref('protein', !prefs.protein)}
            color={COLORS.sagePale}
          />
          <ReminderRow
            icon={<Footprints size={18} color={COLORS.roseBeigeDeep} />}
            label={t('Steps')}
            sublabel=""
            value={prefs.steps}
            onToggle={() => setPref('steps', !prefs.steps)}
            color={COLORS.creamDark}
          />
          <ReminderRow
            icon={<Droplets size={18} color={COLORS.sage} />}
            label={t('Water')}
            sublabel=""
            value={prefs.water}
            onToggle={() => setPref('water', !prefs.water)}
            color={COLORS.sagePale}
          />
          <ReminderRow
            icon={<Star size={18} color={COLORS.warning} />}
            label={t('Score')}
            sublabel=""
            value={prefs.score}
            onToggle={() => setPref('score', !prefs.score)}
            color={COLORS.warningLight}
          />
        </SectionCard>

        {/* Reminders */}
        <SectionCard title={t('Reminders')}>
          <ReminderRow
            icon={<Sun size={18} color={COLORS.warning} />}
            label={t('Morning Check-in')}
            sublabel={t('Start your day right')}
            value={reminders.settings.reminder_morning ?? true}
            onToggle={() => toggleReminder('reminder_morning')}
            color={COLORS.warningLight}
          />
          <ReminderRow
            icon={<Utensils size={18} color={COLORS.rosePrimary} />}
            label={t('Lunch Reminder')}
            sublabel={t('Track your midday meal')}
            value={reminders.settings.reminder_lunch ?? true}
            onToggle={() => toggleReminder('reminder_lunch')}
            color={COLORS.roseBeigeLight}
          />
          <ReminderRow
            icon={<Moon size={18} color={COLORS.sageDark} />}
            label={t('Evening Check-in')}
            sublabel={t('Review your day')}
            value={reminders.settings.reminder_evening ?? true}
            onToggle={() => toggleReminder('reminder_evening')}
            color={COLORS.sagePale}
          />
        </SectionCard>

        {/* Notification delivery */}
        <SectionCard title={t('Notifications')}>
          <ReminderRow
            icon={<Bell size={18} color={COLORS.rosePrimary} />}
            label={t('Push Notifications')}
            sublabel={reminders.pushSupported ? t('Get reminders on this device') : t('Add to Home Screen to enable')}
            value={reminders.settings.push_enabled ?? false}
            onToggle={() => togglePush(!(reminders.settings.push_enabled ?? false))}
            color={COLORS.roseBeigeLight}
            disabled={reminders.busy}
          />
          <ReminderRow
            icon={<Mail size={18} color={COLORS.sageDark} />}
            label={t('Email Reminders')}
            sublabel={profile?.email ? t('Sent to {x}', { x: profile.email }) : t('Add an email to your profile first')}
            value={reminders.settings.email_reminders ?? false}
            onToggle={() => toggleEmail(!(reminders.settings.email_reminders ?? false))}
            color={COLORS.sagePale}
          />
        </SectionCard>

        {/* Data Management */}
        <SectionCard title={t('Data')}>
          <SettingsRow icon={<Download size={18} color={COLORS.sage} />} label={t('Export Data')} sublabel={t('Download your health data')} onPress={() => {}} />
          <SettingsRow icon={<Upload size={18} color={COLORS.sage} />} label={t('Import Data')} sublabel={t('Upload from another device')} onPress={() => {}} />
          <SettingsRow icon={<Shield size={18} color={COLORS.sage} />} label={t('Backup Data')} sublabel={t('Auto-synced to Supabase')} onPress={() => {}} showChevron={false} />
        </SectionCard>

        {/* Account */}
        <SectionCard title={t('Account')}>
          <SettingsRow
            icon={<LogOut size={18} color={COLORS.error} />}
            label={t('Sign Out')}
            sublabel=""
            onPress={handleSignOut}
            labelColor={COLORS.error}
          />
        </SectionCard>

        <Text style={styles.version}>Health Coach v1.1</Text>
        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      <ModalSheet visible={showProfileEdit} onClose={() => setShowProfileEdit(false)} title={t('Edit Profile')}>
        <InputField
          label={t('Full Name')}
          value={profileForm.full_name}
          onChangeText={v => setProfileForm(f => ({ ...f, full_name: v }))}
          placeholder={t('Your name')}
          autoCapitalize="words"
        />
        <InputField
          label={t('Height')}
          value={profileForm.height_cm}
          onChangeText={v => setProfileForm(f => ({ ...f, height_cm: v }))}
          keyboardType="decimal-pad"
          unit="cm"
          placeholder="e.g. 165"
        />
        <PrimaryButton label={t('Save Profile')} onPress={saveProfile} loading={saving} />
      </ModalSheet>

      <ModalSheet visible={showGoals} onClose={() => setShowGoals(false)} title={t('My Goals')}>
        <InputField
          label={t('Target Weight')}
          value={goalsForm.target_weight_kg}
          onChangeText={v => setGoalsForm(f => ({ ...f, target_weight_kg: sanitizeDecimalInput(v) }))}
          keyboardType="decimal-pad"
          unit="kg"
          placeholder="e.g. 55"
        />
        <InputField
          label={t('Target Waist')}
          value={goalsForm.target_waist_cm}
          onChangeText={v => setGoalsForm(f => ({ ...f, target_waist_cm: sanitizeDecimalInput(v) }))}
          keyboardType="decimal-pad"
          unit="cm"
          placeholder="e.g. 80"
        />
        <InputField
          label={t('Focus (what matters to you)')}
          value={goalsForm.goal_focus}
          onChangeText={v => setGoalsForm(f => ({ ...f, goal_focus: v }))}
          placeholder={t('e.g. fat loss, better sleep, keep muscle')}
        />
        <PrimaryButton label={t('Save Goals')} onPress={saveGoals} loading={savingGoals} />
      </ModalSheet>
    </SafeAreaView>
  );
}

function ReminderRow({ icon, label, sublabel, value, onToggle, color, disabled }: {
  icon: React.ReactNode; label: string; sublabel: string; value: boolean; onToggle: () => void; color: string; disabled?: boolean;
}) {
  return (
    <View style={styles.settingsRow}>
      <View style={[styles.settingsIcon, { backgroundColor: color }]}>{icon}</View>
      <View style={styles.settingsInfo}>
        <Text style={styles.settingsLabel}>{label}</Text>
        {sublabel ? <Text style={styles.settingsSub}>{sublabel}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: COLORS.creamBorder, true: COLORS.rosePrimary }}
        thumbColor={COLORS.white}
      />
    </View>
  );
}

function SettingsRow({ icon, label, sublabel, onPress, showChevron = true, labelColor }: {
  icon: React.ReactNode; label: string; sublabel: string; onPress: () => void; showChevron?: boolean; labelColor?: string;
}) {
  return (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.settingsIcon, { backgroundColor: COLORS.creamDark }]}>{icon}</View>
      <View style={styles.settingsInfo}>
        <Text style={[styles.settingsLabel, labelColor ? { color: labelColor } : null]}>{label}</Text>
        {sublabel ? <Text style={styles.settingsSub}>{sublabel}</Text> : null}
      </View>
      {showChevron && <ChevronRight size={18} color={COLORS.charcoalMuted} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { flex: 1 },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  pageTitle: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: COLORS.charcoal,
    letterSpacing: -0.5,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOW.card,
    gap: SPACING.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.rosePrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.charcoal,
  },
  profileEmail: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.charcoalMuted,
    marginTop: 2,
  },
  editProfileBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.creamDark,
  },
  editProfileTxt: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.charcoalMed,
  },
  langRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  sectionHint: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.charcoalMuted,
    marginBottom: SPACING.sm,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.creamBorder,
    gap: SPACING.md,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsInfo: {
    flex: 1,
  },
  settingsLabel: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.charcoal,
  },
  settingsSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.charcoalMuted,
    marginTop: 1,
  },
  version: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.charcoalMuted,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
});
