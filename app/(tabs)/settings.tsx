import React, { useState, useCallback, useEffect } from 'react';
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
  HeartPulse,
  Activity,
  Beef,
  Flame,
  Timer,
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
import { sanitizeDecimalInput, parseNumericInput, suggestNutritionTargets } from '@/lib/utils';
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
  const [showSync, setShowSync] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [goalsForm, setGoalsForm] = useState({ target_weight_kg: '', target_waist_cm: '', goal_focus: '', health_context: '' });
  const [savingGoals, setSavingGoals] = useState(false);
  const [showTargets, setShowTargets] = useState(false);
  const [targetsForm, setTargetsForm] = useState({ calories: '', protein: '', carbs: '', fat: '', veg: '' });
  const [savingTargets, setSavingTargets] = useState(false);
  const [showFasting, setShowFasting] = useState(false);
  const [fastingForm, setFastingForm] = useState({ enabled: false, start: '12:00', end: '20:00' });
  const [savingFasting, setSavingFasting] = useState(false);
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
      health_context: reminders.settings.health_context ?? '',
    });
    setShowGoals(true);
  };

  const saveGoals = async () => {
    setSavingGoals(true);
    const error = await reminders.save({
      target_weight_kg: parseNumericInput(goalsForm.target_weight_kg),
      target_waist_cm: parseNumericInput(goalsForm.target_waist_cm),
      goal_focus: goalsForm.goal_focus.trim() || null,
      health_context: goalsForm.health_context.trim() || null,
    });
    setSavingGoals(false);
    if (error) {
      Alert.alert(t('Could not save goals'), error.message);
      return;
    }
    setShowGoals(false);
  };

  const openTargets = () => {
    const s = reminders.settings;
    const str = (v: number | null | undefined) => (v != null ? String(v) : '');
    setTargetsForm({
      calories: str(s.target_calories),
      protein: str(s.target_protein_g),
      carbs: str(s.target_carbs_g),
      fat: str(s.target_fat_g),
      veg: str(s.target_veg_servings),
    });
    setShowTargets(true);
  };

  const suggestTargets = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('daily_logs')
      .select('weight_kg')
      .eq('user_id', userId)
      .not('weight_kg', 'is', null)
      .order('log_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    const weight = (data as { weight_kg: number | null } | null)?.weight_kg;
    if (!weight) {
      Alert.alert(t('No weight yet'), t('Log your weight first so targets can be based on it.'));
      return;
    }
    const s = suggestNutritionTargets(weight);
    setTargetsForm({
      calories: String(s.target_calories),
      protein: String(s.target_protein_g),
      carbs: String(s.target_carbs_g),
      fat: String(s.target_fat_g),
      veg: String(s.target_veg_servings),
    });
  };

  const saveTargets = async () => {
    setSavingTargets(true);
    const error = await reminders.save({
      target_calories: parseNumericInput(targetsForm.calories),
      target_protein_g: parseNumericInput(targetsForm.protein),
      target_carbs_g: parseNumericInput(targetsForm.carbs),
      target_fat_g: parseNumericInput(targetsForm.fat),
      target_veg_servings: parseNumericInput(targetsForm.veg),
    });
    setSavingTargets(false);
    if (error) {
      Alert.alert(t('Something went wrong'), error.message);
      return;
    }
    setShowTargets(false);
  };

  const openFasting = () => {
    setFastingForm({
      enabled: reminders.settings.fasting_enabled === true,
      start: reminders.settings.eating_window_start ?? '12:00',
      end: reminders.settings.eating_window_end ?? '20:00',
    });
    setShowFasting(true);
  };

  const saveFasting = async () => {
    setSavingFasting(true);
    const error = await reminders.save({
      fasting_enabled: fastingForm.enabled,
      eating_window_start: fastingForm.start.trim() || null,
      eating_window_end: fastingForm.end.trim() || null,
    });
    setSavingFasting(false);
    if (error) {
      Alert.alert(t('Something went wrong'), error.message);
      return;
    }
    setShowFasting(false);
  };

  const fastingSummary = reminders.settings.fasting_enabled
    ? `${reminders.settings.eating_window_start ?? '12:00'}–${reminders.settings.eating_window_end ?? '20:00'}`
    : t('Off');

  const targetsSummary = reminders.settings.target_calories != null
    ? t('{x} kcal/day target', { x: reminders.settings.target_calories })
    : t('Set calories, protein, carbs & good fat');

  const syncUrl = reminders.settings.sync_token
    ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/sync-sleep?token=${reminders.settings.sync_token}`
    : null;

  // Withings connection status + connect handler.
  const [withingsConnected, setWithingsConnected] = useState<boolean | null>(null);
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('withings_tokens')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => setWithingsConnected(!!data));
  }, [userId]);

  const connectWithings = async () => {
    const { data, error } = await supabase.functions.invoke('withings-connect');
    if (error || data?.error) {
      Alert.alert(t('Something went wrong'), t('Could not start Withings connection. Please try again.'));
      return;
    }
    if (data?.code === 'not_configured') {
      Alert.alert(t('Almost there'), t('Withings is not set up yet on the server.'));
      return;
    }
    if (data?.url && typeof window !== 'undefined') window.open(data.url as string, '_blank');
  };

  const openSync = async () => {
    setShowSync(true);
    if (!reminders.settings.sync_token) {
      // First open: mint a personal token (random, unguessable).
      setSyncBusy(true);
      const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      const error = await reminders.save({ sync_token: token });
      setSyncBusy(false);
      if (error) Alert.alert(t('Something went wrong'), error.message);
    }
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
          <SettingsRow
            icon={<Flame size={18} color={COLORS.warning} />}
            label={t('Nutrition Targets')}
            sublabel={targetsSummary}
            onPress={openTargets}
          />
          <SettingsRow
            icon={<Timer size={18} color={COLORS.roseAccent} />}
            label={t('16:8 Fasting')}
            sublabel={fastingSummary}
            onPress={openFasting}
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
            icon={<Beef size={18} color={COLORS.sageDark} />}
            label={t('Lean Mass')}
            sublabel=""
            value={prefs.lean_mass}
            onToggle={() => setPref('lean_mass', !prefs.lean_mass)}
            color={COLORS.sagePale}
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
            icon={<Flame size={18} color={COLORS.warning} />}
            label={t('Active Cal')}
            sublabel=""
            value={prefs.active_kcal}
            onToggle={() => setPref('active_kcal', !prefs.active_kcal)}
            color={COLORS.warningLight}
          />
          <ReminderRow
            icon={<HeartPulse size={18} color={COLORS.rosePrimary} />}
            label={t('Resting HR')}
            sublabel=""
            value={prefs.resting_hr}
            onToggle={() => setPref('resting_hr', !prefs.resting_hr)}
            color={COLORS.roseBeigeLight}
          />
          <ReminderRow
            icon={<Activity size={18} color={COLORS.roseAccent} />}
            label={t('HRV')}
            sublabel=""
            value={prefs.hrv}
            onToggle={() => setPref('hrv', !prefs.hrv)}
            color={COLORS.roseBeigeLight}
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
          <SettingsRow
            icon={<Moon size={18} color={COLORS.sageDark} />}
            label={t('Sleep Sync')}
            sublabel={t('Auto-import sleep from Garmin / Apple Health')}
            onPress={openSync}
          />
          <SettingsRow
            icon={<Activity size={18} color={COLORS.roseAccent} />}
            label={t('Connect Withings scale')}
            sublabel={withingsConnected ? t('Connected — weight & body fat sync automatically') : t('Auto-import weight, body fat, lean mass')}
            onPress={connectWithings}
          />
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
          placeholder={t('e.g. fat loss, better sleep, more focus')}
        />
        <InputField
          label={t('Medications / health notes (optional)')}
          value={goalsForm.health_context}
          onChangeText={v => setGoalsForm(f => ({ ...f, health_context: v }))}
          placeholder={t('e.g. taking medication X, sensitive to caffeine')}
          multiline
        />
        <PrimaryButton label={t('Save Goals')} onPress={saveGoals} loading={savingGoals} />
      </ModalSheet>

      <ModalSheet visible={showTargets} onClose={() => setShowTargets(false)} title={t('Nutrition Targets')}>
        <Text style={styles.sectionHint}>{t('Your daily plan to lose fat. Tap “Suggest from my weight”, then adjust.')}</Text>
        <PrimaryButton label={t('Suggest from my weight')} onPress={suggestTargets} variant="secondary" />
        <View style={{ height: SPACING.sm }} />
        <InputField label={t('Calories')} value={targetsForm.calories} onChangeText={v => setTargetsForm(f => ({ ...f, calories: sanitizeDecimalInput(v) }))} keyboardType="decimal-pad" unit="kcal" placeholder="e.g. 1400" />
        <InputField label={t('Protein')} value={targetsForm.protein} onChangeText={v => setTargetsForm(f => ({ ...f, protein: sanitizeDecimalInput(v) }))} keyboardType="decimal-pad" unit="g" placeholder="e.g. 105" />
        <InputField label={t('Carbs')} value={targetsForm.carbs} onChangeText={v => setTargetsForm(f => ({ ...f, carbs: sanitizeDecimalInput(v) }))} keyboardType="decimal-pad" unit="g" placeholder="e.g. 120" />
        <InputField label={t('Fat')} value={targetsForm.fat} onChangeText={v => setTargetsForm(f => ({ ...f, fat: sanitizeDecimalInput(v) }))} keyboardType="decimal-pad" unit="g" placeholder="e.g. 45" />
        <InputField label={t('Vegetables')} value={targetsForm.veg} onChangeText={v => setTargetsForm(f => ({ ...f, veg: sanitizeDecimalInput(v) }))} keyboardType="decimal-pad" unit={t('servings')} placeholder="e.g. 4" />
        <PrimaryButton label={t('Save Targets')} onPress={saveTargets} loading={savingTargets} />
      </ModalSheet>

      <ModalSheet visible={showFasting} onClose={() => setShowFasting(false)} title={t('16:8 Fasting')}>
        <Text style={styles.sectionHint}>{t('Set your daily eating window — the app shows live eating/fasting status & countdown.')}</Text>
        <ReminderRow
          icon={<Timer size={18} color={COLORS.roseAccent} />}
          label={t('Show fasting window')}
          sublabel=""
          value={fastingForm.enabled}
          onToggle={() => setFastingForm(f => ({ ...f, enabled: !f.enabled }))}
          color={COLORS.roseBeigeLight}
        />
        <InputField label={t('Eating window start')} value={fastingForm.start} onChangeText={v => setFastingForm(f => ({ ...f, start: v }))} placeholder="12:00" />
        <InputField label={t('Eating window end')} value={fastingForm.end} onChangeText={v => setFastingForm(f => ({ ...f, end: v }))} placeholder="20:00" />
        <PrimaryButton label={t('Save')} onPress={saveFasting} loading={savingFasting} />
      </ModalSheet>

      <ModalSheet visible={showSync} onClose={() => setShowSync(false)} title={t('Sleep Sync')}>
        <Text style={styles.syncText}>{t('Your personal sync link (keep it private):')}</Text>
        {syncBusy ? (
          <Text style={styles.syncText}>…</Text>
        ) : syncUrl ? (
          <InputField label="URL" value={syncUrl} onChangeText={() => {}} multiline />
        ) : null}
        <Text style={styles.syncText}>{t('Use it in an iPhone Shortcut to send last night\u2019s sleep automatically — setup steps are in the chat guide.')}</Text>
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
  syncText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.charcoalMed,
    marginBottom: SPACING.sm,
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
