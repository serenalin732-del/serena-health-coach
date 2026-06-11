import React, { useState, useEffect } from 'react';
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
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '@/lib/theme';
import { SectionCard } from '@/components/Cards';
import { ModalSheet } from '@/components/UI';
import { InputField, PrimaryButton } from '@/components/Inputs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useReminders, type ReminderKey } from '@/hooks/useReminders';
import type { UserProfile } from '@/lib/types';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const userId = user?.id ?? '';
  const onSignOut = signOut;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: '', height_cm: '' });
  const [saving, setSaving] = useState(false);
  const reminders = useReminders(userId);

  useEffect(() => {
    supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => setProfile(data as UserProfile | null));
  }, [userId]);

  const toggleReminder = (key: ReminderKey) => reminders.toggle(key);

  const togglePush = async (enabled: boolean) => {
    const result = await reminders.setPushEnabled(enabled);
    if (result === 'denied') {
      Alert.alert('Notifications blocked', 'Enable notifications for this site in your browser settings, then try again.');
    } else if (result === 'unsupported') {
      Alert.alert('Not supported here', 'Open the app in a browser (and add it to your Home Screen on iOS) to enable push notifications.');
    } else if (result === 'misconfigured') {
      Alert.alert('Almost there', 'Push is not configured yet (missing VAPID key). Email reminders still work.');
    } else if (result === 'error') {
      Alert.alert('Something went wrong', 'Could not enable push notifications. Please try again.');
    }
  };

  const toggleEmail = (enabled: boolean) =>
    reminders.setEmailReminders(enabled, profile?.email ?? null);

  const openProfileEdit = () => {
    setProfileForm({ full_name: profile?.full_name ?? '', height_cm: profile?.height_cm ? String(profile.height_cm) : '' });
    setShowProfileEdit(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    const { data } = await supabase
      .from('user_profiles')
      .upsert({ id: userId, full_name: profileForm.full_name, height_cm: profileForm.height_cm ? parseFloat(profileForm.height_cm) : null }, { onConflict: 'id' })
      .select()
      .maybeSingle();
    if (data) setProfile(data as UserProfile);
    setSaving(false);
    setShowProfileEdit(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: onSignOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Settings</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(profile?.full_name ?? 'S').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.full_name ?? 'Serena User'}</Text>
            <Text style={styles.profileEmail}>{profile?.email ?? ''}</Text>
          </View>
          <TouchableOpacity onPress={openProfileEdit} style={styles.editProfileBtn}>
            <Text style={styles.editProfileTxt}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Reminders */}
        <SectionCard title="Reminders">
          <ReminderRow
            icon={<Sun size={18} color={COLORS.warning} />}
            label="Morning Check-in"
            sublabel="Start your day right"
            value={reminders.settings.reminder_morning ?? true}
            onToggle={() => toggleReminder('reminder_morning')}
            color={COLORS.warningLight}
          />
          <ReminderRow
            icon={<Utensils size={18} color={COLORS.rosePrimary} />}
            label="Lunch Reminder"
            sublabel="Track your midday meal"
            value={reminders.settings.reminder_lunch ?? true}
            onToggle={() => toggleReminder('reminder_lunch')}
            color={COLORS.roseBeigeLight}
          />
          <ReminderRow
            icon={<Moon size={18} color={COLORS.sageDark} />}
            label="Evening Check-in"
            sublabel="Review your day"
            value={reminders.settings.reminder_evening ?? true}
            onToggle={() => toggleReminder('reminder_evening')}
            color={COLORS.sagePale}
          />
        </SectionCard>

        {/* Notification delivery */}
        <SectionCard title="Notifications">
          <ReminderRow
            icon={<Bell size={18} color={COLORS.rosePrimary} />}
            label="Push Notifications"
            sublabel={reminders.pushSupported ? 'Get reminders on this device' : 'Add to Home Screen to enable'}
            value={reminders.settings.push_enabled ?? false}
            onToggle={() => togglePush(!(reminders.settings.push_enabled ?? false))}
            color={COLORS.roseBeigeLight}
            disabled={reminders.busy}
          />
          <ReminderRow
            icon={<Mail size={18} color={COLORS.sageDark} />}
            label="Email Reminders"
            sublabel={profile?.email ? `Sent to ${profile.email}` : 'Add an email to your profile first'}
            value={reminders.settings.email_reminders ?? false}
            onToggle={() => toggleEmail(!(reminders.settings.email_reminders ?? false))}
            color={COLORS.sagePale}
          />
        </SectionCard>

        {/* Data Management */}
        <SectionCard title="Data">
          <SettingsRow icon={<Download size={18} color={COLORS.sage} />} label="Export Data" sublabel="Download your health data" onPress={() => {}} />
          <SettingsRow icon={<Upload size={18} color={COLORS.sage} />} label="Import Data" sublabel="Upload from another device" onPress={() => {}} />
          <SettingsRow icon={<Shield size={18} color={COLORS.sage} />} label="Backup Data" sublabel="Auto-synced to Supabase" onPress={() => {}} showChevron={false} />
        </SectionCard>

        {/* Account */}
        <SectionCard title="Account">
          <SettingsRow
            icon={<LogOut size={18} color={COLORS.error} />}
            label="Sign Out"
            sublabel=""
            onPress={handleSignOut}
            labelColor={COLORS.error}
          />
        </SectionCard>

        <Text style={styles.version}>Serena Health Coach v1.0</Text>
        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      <ModalSheet visible={showProfileEdit} onClose={() => setShowProfileEdit(false)} title="Edit Profile">
        <InputField
          label="Full Name"
          value={profileForm.full_name}
          onChangeText={v => setProfileForm(f => ({ ...f, full_name: v }))}
          placeholder="Your name"
          autoCapitalize="words"
        />
        <InputField
          label="Height"
          value={profileForm.height_cm}
          onChangeText={v => setProfileForm(f => ({ ...f, height_cm: v }))}
          keyboardType="decimal-pad"
          unit="cm"
          placeholder="e.g. 165"
        />
        <PrimaryButton label="Save Profile" onPress={saveProfile} loading={saving} />
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
