import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '@/lib/theme';
import { LineChart, BarChart } from '@/components/Charts';
import { useTrends, TrendRange } from '@/hooks/useTrends';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { Chip } from '@/components/Inputs';

const RANGES: { label: string; value: TrendRange }[] = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: '1Y', value: '1y' },
];

export default function TrendsScreen() {
  const { user } = useAuth();
  const { t } = useI18n();
  const userId = user?.id ?? '';
  const {
    range, setRange,
    weightData, waistData, bodyFatData,
    proteinData, sleepData, habitData,
    loading,
  } = useTrends(userId);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>{t('Trends')}</Text>
          <View style={styles.rangeRow}>
            {RANGES.map(r => (
              <Chip key={r.value} label={r.label} selected={range === r.value} onPress={() => setRange(r.value)} />
            ))}
          </View>
        </View>

        <ChartSection title={t('Weight')} color={COLORS.rosePrimary} gradientId="weight">
          <LineChart data={weightData} color={COLORS.rosePrimary} unit="kg" loading={loading} gradientId="weight" />
        </ChartSection>

        <ChartSection title={t('Waist Circumference')} color={COLORS.roseAccent} gradientId="waist">
          <LineChart data={waistData} color={COLORS.roseAccent} unit="cm" loading={loading} gradientId="waist" />
        </ChartSection>

        <ChartSection title={t('Body Fat %')} color={COLORS.warning} gradientId="bodyfat">
          <LineChart data={bodyFatData} color={COLORS.warning} unit="%" loading={loading} gradientId="bodyfat" />
        </ChartSection>

        <ChartSection title={t('Protein Intake')} color={COLORS.sageDark} gradientId="protein">
          <LineChart data={proteinData} color={COLORS.sageDark} unit="g" loading={loading} gradientId="protein" />
        </ChartSection>

        <ChartSection title={t('Sleep Duration')} color={COLORS.sage} gradientId="sleep">
          <LineChart data={sleepData} color={COLORS.sage} unit="hrs" loading={loading} gradientId="sleep" />
        </ChartSection>

        <ChartSection title={t('Habit Completion')} color={COLORS.success} gradientId="habits">
          <BarChart data={habitData} color={COLORS.success} unit="%" maxValue={100} loading={loading} />
        </ChartSection>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ChartSection({ title, color, children }: { title: string; color: string; children: React.ReactNode; gradientId?: string }) {
  return (
    <View style={styles.chartCard}>
      <View style={styles.chartTitleRow}>
        <View style={[styles.chartDot, { backgroundColor: color }]} />
        <Text style={styles.chartTitle}>{title}</Text>
      </View>
      {children}
    </View>
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
    marginBottom: SPACING.md,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  chartCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.card,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  chartDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chartTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.charcoal,
  },
});
