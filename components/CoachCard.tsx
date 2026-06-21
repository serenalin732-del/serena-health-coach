import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Sparkles, RefreshCw } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';

interface CoachCardProps {
  coaching: string | null;
  loading: boolean;
  error: string | null;
  configured: boolean;
  onGenerate: () => void;
  title?: string;
  subtitle?: string;
  loadingText?: string;
  ctaLabel?: string;
}

export function CoachCard({ coaching, loading, error, configured, onGenerate, title, subtitle, loadingText, ctaLabel }: CoachCardProps) {
  const { t } = useI18n();
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Sparkles size={18} color={COLORS.rosePrimary} />
        <Text style={styles.title}>{title ?? t('Daily Coaching')}</Text>
        {coaching && !loading && (
          <TouchableOpacity onPress={onGenerate} style={styles.refresh} accessibilityLabel="Refresh coaching">
            <RefreshCw size={15} color={COLORS.charcoalMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.row}>
          <ActivityIndicator color={COLORS.rosePrimary} />
          <Text style={styles.muted}>{loadingText ?? t('Reading your week…')}</Text>
        </View>
      ) : !configured ? (
        <Text style={styles.muted}>{t('AI coaching turns on once the AI key is configured.')}</Text>
      ) : error ? (
        <View>
          <Text style={styles.error}>{t(error)}</Text>
          <TouchableOpacity onPress={onGenerate} style={styles.btn}>
            <Text style={styles.btnText}>{t('Try again')}</Text>
          </TouchableOpacity>
        </View>
      ) : coaching ? (
        <Text style={styles.body}>{coaching}</Text>
      ) : (
        <View>
          <Text style={styles.sub}>{subtitle ?? t("Get a quick, personal read on your week based on what you've logged.")}</Text>
          <TouchableOpacity onPress={onGenerate} style={styles.btn}>
            <Sparkles size={15} color={COLORS.white} />
            <Text style={styles.btnText}>{ctaLabel ?? t('Coach me')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.roseBeigeLight,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.roseBeige,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.charcoal,
    flex: 1,
  },
  refresh: {
    padding: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.charcoalMed,
  },
  sub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.charcoalMuted,
    marginBottom: SPACING.sm,
  },
  muted: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.charcoalMuted,
  },
  error: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.error,
    marginBottom: SPACING.sm,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.rosePrimary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
  },
  btnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.white,
  },
});
