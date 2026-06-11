import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import {
  Weight,
  Ruler,
  Percent,
  Footprints,
  Droplets,
  Moon,
  Star,
  Heart,
  Dumbbell,
  Leaf,
  Zap,
  Utensils,
  Ban,
  TrendingUp,
  CheckCircle2,
  Circle,
  FlameIcon,
} from 'lucide-react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '@/lib/theme';
import { MetricCard, SectionCard } from '@/components/Cards';
import { ModalSheet } from '@/components/UI';
import { ProgressBar } from '@/components/UI';
import { InputField, PrimaryButton } from '@/components/Inputs';
import { useDailyLog } from '@/hooks/useDailyLog';
import { useWeeklySummary } from '@/hooks/useWeeklySummary';
import { useAuth } from '@/hooks/useAuth';
import { QuickLogCard, WeeklySummaryCard } from '@/components/DailyCards';
import { HABITS } from '@/lib/types';
import {
  todayStr,
  formatFullDate,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
  parseNumericInput,
} from '@/lib/utils';
import type { DailyLog } from '@/lib/types';

type MetricForm = {
  weight_kg: string;
  waist_cm: string;
  body_fat_pct: string;
  steps: string;
  water_ml: string;
  protein_g: string;
};

const EMPTY_METRIC_FORM: MetricForm = {
  weight_kg: '',
  waist_cm: '',
  body_fat_pct: '',
  steps: '',
  water_ml: '',
  protein_g: '',
};

const numToStr = (v: number | null | undefined): string =>
  v === null || v === undefined ? '' : String(v);

const HABIT_ICONS: Record<string, React.ReactNode> = {
  protein_90g: <Dumbbell size={16} color={COLORS.rosePrimary} />,
  veggies_2: <Leaf size={16} color={COLORS.sage} />,
  steps_8000: <Footprints size={16} color={COLORS.roseBeigeDeep} />,
  strength_training: <Zap size={16} color={COLORS.warning} />,
  sleep_7h: <Moon size={16} color={COLORS.sageDark} />,
  water_1800ml: <Droplets size={16} color={COLORS.sage} />,
  low_carb_dinner: <Utensils size={16} color={COLORS.roseAccent} />,
  no_sugary_drinks: <Ban size={16} color={COLORS.charcoalMuted} />,
};

export default function DashboardScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const today = todayStr();
  const { log, habits, loading, saving, saveLog, toggleHabit, completedCount, totalHabits, completionPct, dailyScore, refresh } = useDailyLog(userId, today);
  const week = useWeeklySummary(userId);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState<MetricForm>(EMPTY_METRIC_FORM);
  const [refreshing, setRefreshing] = useState(false);

  const quickLog = async (updates: Partial<DailyLog>) => {
    await saveLog(updates);
    week.refresh();
  };

  const openEdit = () => {
    setForm({
      weight_kg: numToStr(log?.weight_kg),
      waist_cm: numToStr(log?.waist_cm),
      body_fat_pct: numToStr(log?.body_fat_pct),
      steps: numToStr(log?.steps),
      water_ml: numToStr(log?.water_ml),
      protein_g: numToStr(log?.protein_g),
    });
    setShowEdit(true);
  };

  const handleSave = async () => {
    const updates: Partial<DailyLog> = {
      weight_kg: parseNumericInput(form.weight_kg),
      waist_cm: parseNumericInput(form.waist_cm),
      body_fat_pct: parseNumericInput(form.body_fat_pct),
      steps: parseNumericInput(form.steps),
      water_ml: parseNumericInput(form.water_ml),
      protein_g: parseNumericInput(form.protein_g),
    };
    await saveLog(updates);
    setShowEdit(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), week.refresh()]);
    setRefreshing(false);
  };

  const scoreColor = dailyScore >= 75 ? COLORS.success : dailyScore >= 50 ? COLORS.warning : COLORS.rosePrimary;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.rosePrimary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.dateText}>{formatFullDate(today)}</Text>
            <Text style={styles.greeting}>Good morning!</Text>
          </View>
          <TouchableOpacity onPress={openEdit} style={styles.editBtn}>
            <Text style={styles.editBtnTxt}>Edit Today</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Log — one-tap weight & waist */}
        <QuickLogCard
          weightToday={log?.weight_kg ?? null}
          waistToday={log?.waist_cm ?? null}
          latestWeight={week.latestWeight}
          latestWaist={week.latestWaist}
          onLogWeight={v => quickLog({ weight_kg: v })}
          onLogWaist={v => quickLog({ waist_cm: v })}
        />

        {/* Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreLeft}>
            <Text style={styles.scoreHeading}>Daily Score</Text>
            <Text style={[styles.scoreValue, { color: scoreColor }]}>{dailyScore}</Text>
            <Text style={styles.scoreSub}>{completedCount}/{totalHabits} habits complete</Text>
          </View>
          <View style={styles.scoreRight}>
            <View style={styles.streakBadge}>
              <FlameIcon size={18} color={COLORS.warning} />
              <Text style={styles.streakText}>Streak</Text>
            </View>
            <View style={styles.scoreRingContainer}>
              <ProgressBar value={completionPct} color={scoreColor} height={10} />
              <Text style={styles.scoreRingPct}>{completionPct}% complete</Text>
            </View>
          </View>
        </View>

        {/* Weekly progress summary */}
        <WeeklySummaryCard
          weightDelta={week.weightDelta}
          waistDelta={week.waistDelta}
          avgHabitPct={week.avgHabitPct}
          daysLogged={week.daysLogged}
          loading={week.loading}
        />

        {/* Metrics Grid */}
        <View style={styles.metricsHeader}>
          <Text style={styles.sectionHeading}>Today's Metrics</Text>
        </View>
        <View style={styles.metricsGrid}>
          <MetricCard
            label="Weight"
            value={log?.weight_kg ?? null}
            unit="kg"
            icon={<Weight size={16} color={COLORS.rosePrimary} />}
            accent={COLORS.rosePrimary}
            style={styles.metricHalf}
          />
          <MetricCard
            label="Waist"
            value={log?.waist_cm ?? null}
            unit="cm"
            icon={<Ruler size={16} color={COLORS.roseAccent} />}
            accent={COLORS.roseAccent}
            style={styles.metricHalf}
          />
          <MetricCard
            label="Body Fat"
            value={log?.body_fat_pct ?? null}
            unit="%"
            icon={<Percent size={16} color={COLORS.warning} />}
            accent={COLORS.warning}
            style={styles.metricHalf}
          />
          <MetricCard
            label="Protein"
            value={log?.protein_g ? Math.round(log.protein_g) : null}
            unit="g"
            icon={<Dumbbell size={16} color={COLORS.sageDark} />}
            accent={COLORS.sageDark}
            style={styles.metricHalf}
          />
          <MetricCard
            label="Steps"
            value={log?.steps ? log.steps.toLocaleString() : null}
            icon={<Footprints size={16} color={COLORS.roseBeigeDeep} />}
            accent={COLORS.roseBeigeDeep}
            style={styles.metricHalf}
          />
          <MetricCard
            label="Water"
            value={log?.water_ml ? (log.water_ml / 1000).toFixed(1) : null}
            unit="L"
            icon={<Droplets size={16} color={COLORS.sage} />}
            accent={COLORS.sage}
            style={styles.metricHalf}
          />
          <MetricCard
            label="Cycle Day"
            value={log?.cycle_day ?? null}
            icon={<Heart size={16} color={COLORS.roseBeige} />}
            accent={COLORS.roseBeige}
            style={styles.metricHalf}
          />
          <MetricCard
            label="Score"
            value={dailyScore}
            unit="/ 100"
            icon={<Star size={16} color={COLORS.warning} />}
            accent={COLORS.warning}
            style={styles.metricHalf}
          />
        </View>

        {/* Habit Checklist */}
        <SectionCard
          title="Daily Habits"
          rightHeader={
            <View style={[styles.habitBadge, { backgroundColor: completionPct >= 80 ? COLORS.successLight : COLORS.creamDark }]}>
              <Text style={[styles.habitBadgeText, { color: completionPct >= 80 ? COLORS.success : COLORS.charcoalMuted }]}>
                {completedCount}/{totalHabits}
              </Text>
            </View>
          }
        >
          {HABITS.map(habit => {
            const done = habits[habit.key] ?? false;
            return (
              <TouchableOpacity
                key={habit.key}
                style={[styles.habitRow, done && styles.habitRowDone]}
                onPress={() => toggleHabit(habit.key)}
                activeOpacity={0.7}
              >
                <View style={styles.habitIcon}>{HABIT_ICONS[habit.key]}</View>
                <Text style={[styles.habitLabel, done && styles.habitLabelDone]}>{habit.label}</Text>
                <View style={styles.habitCheck}>
                  {done
                    ? <CheckCircle2 size={22} color={COLORS.success} />
                    : <Circle size={22} color={COLORS.creamBorder} />
                  }
                </View>
              </TouchableOpacity>
            );
          })}
        </SectionCard>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Edit Modal */}
      <ModalSheet visible={showEdit} onClose={() => setShowEdit(false)} title="Log Today's Metrics">
        <InputField
          label="Weight"
          value={form.weight_kg}
          onChangeText={v => setForm(f => ({ ...f, weight_kg: sanitizeDecimalInput(v) }))}
          keyboardType="decimal-pad"
          unit="kg"
          placeholder="e.g. 68.5"
        />
        <InputField
          label="Waist Circumference"
          value={form.waist_cm}
          onChangeText={v => setForm(f => ({ ...f, waist_cm: sanitizeDecimalInput(v) }))}
          keyboardType="decimal-pad"
          unit="cm"
          placeholder="e.g. 78"
        />
        <InputField
          label="Body Fat"
          value={form.body_fat_pct}
          onChangeText={v => setForm(f => ({ ...f, body_fat_pct: sanitizeDecimalInput(v) }))}
          keyboardType="decimal-pad"
          unit="%"
          placeholder="e.g. 28"
        />
        <InputField
          label="Steps"
          value={form.steps}
          onChangeText={v => setForm(f => ({ ...f, steps: sanitizeIntegerInput(v) }))}
          keyboardType="number-pad"
          placeholder="e.g. 8500"
        />
        <InputField
          label="Water"
          value={form.water_ml}
          onChangeText={v => setForm(f => ({ ...f, water_ml: sanitizeIntegerInput(v) }))}
          keyboardType="number-pad"
          unit="ml"
          placeholder="e.g. 2000"
        />
        <InputField
          label="Protein"
          value={form.protein_g}
          onChangeText={v => setForm(f => ({ ...f, protein_g: sanitizeDecimalInput(v) }))}
          keyboardType="decimal-pad"
          unit="g"
          placeholder="e.g. 95"
        />
        <PrimaryButton label="Save Metrics" onPress={handleSave} loading={saving} />
      </ModalSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  dateText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.charcoalMuted,
    letterSpacing: 0.2,
  },
  greeting: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: COLORS.charcoal,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  editBtn: {
    backgroundColor: COLORS.rosePrimary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    marginTop: 6,
  },
  editBtnTxt: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.white,
  },
  scoreCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    flexDirection: 'row',
    marginBottom: SPACING.md,
    ...SHADOW.cardMd,
  },
  scoreLeft: {
    flex: 1,
  },
  scoreRight: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scoreHeading: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.charcoalMuted,
    marginBottom: 4,
  },
  scoreValue: {
    fontFamily: FONTS.bold,
    fontSize: 48,
    letterSpacing: -2,
    lineHeight: 52,
  },
  scoreSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.charcoalMuted,
    marginTop: 4,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    alignSelf: 'flex-end',
  },
  streakText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.warning,
  },
  scoreRingContainer: {
    marginTop: SPACING.sm,
  },
  scoreRingPct: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.charcoalMuted,
    marginTop: 4,
  },
  metricsHeader: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  sectionHeading: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.charcoal,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  metricHalf: {
    width: '47.5%',
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.creamBorder,
    gap: SPACING.sm,
  },
  habitRowDone: {
    opacity: 0.7,
  },
  habitIcon: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitLabel: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.charcoal,
  },
  habitLabelDone: {
    textDecorationLine: 'line-through',
    color: COLORS.charcoalMuted,
  },
  habitCheck: {
    marginLeft: SPACING.xs,
  },
  habitBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  habitBadgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
  },
});
