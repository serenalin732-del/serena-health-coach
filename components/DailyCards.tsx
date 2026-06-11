import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Minus, Plus, Check, TrendingDown, TrendingUp, Minus as Flat } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '@/lib/theme';

// ---------------------------------------------------------------------------
// One-tap quick log: tap − / + to adjust and it auto-saves (debounced), so a
// daily weight/waist entry takes a couple of taps and no keyboard.
// ---------------------------------------------------------------------------
interface QuickLogRowProps {
  label: string;
  icon: React.ReactNode;
  value: number | null; // today's value, if already logged
  seed: number | null; // most recent known value, used to start from
  unit: string;
  step: number;
  fallback: number; // starting point when there is no history at all
  decimals?: number;
  accent: string;
  onCommit: (value: number) => Promise<unknown> | void;
}

type SaveState = 'idle' | 'saving' | 'saved';

function QuickLogRow({
  label,
  icon,
  value,
  seed,
  unit,
  step,
  fallback,
  decimals = 1,
  accent,
  onCommit,
}: QuickLogRowProps) {
  const [draft, setDraft] = useState<number | null>(value);
  const [state, setState] = useState<SaveState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep in sync when today's value loads/changes from the server.
  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    []
  );

  const round = (n: number) => Math.round(n * 10 ** decimals) / 10 ** decimals;

  const adjust = (dir: 1 | -1) => {
    const base = draft ?? seed ?? fallback;
    const next = Math.max(0, round(base + dir * step));
    setDraft(next);
    setState('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await onCommit(next);
      setState('saved');
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setState('idle'), 1500);
    }, 700);
  };

  const display = draft != null ? draft.toFixed(decimals) : '--';

  return (
    <View style={styles.qlRow}>
      <View style={[styles.qlIcon, { backgroundColor: accent + '22' }]}>{icon}</View>
      <View style={styles.qlLabelWrap}>
        <Text style={styles.qlLabel}>{label}</Text>
        <View style={styles.qlStatusRow}>
          {state === 'saving' && <ActivityIndicator size="small" color={COLORS.charcoalMuted} />}
          {state === 'saved' && (
            <>
              <Check size={12} color={COLORS.success} />
              <Text style={styles.qlSaved}>Saved</Text>
            </>
          )}
        </View>
      </View>
      <TouchableOpacity onPress={() => adjust(-1)} style={styles.qlBtn} accessibilityLabel={`Decrease ${label}`}>
        <Minus size={18} color={COLORS.charcoalMed} />
      </TouchableOpacity>
      <View style={styles.qlValueWrap}>
        <Text style={[styles.qlValue, { color: accent }]}>{display}</Text>
        <Text style={styles.qlUnit}>{unit}</Text>
      </View>
      <TouchableOpacity onPress={() => adjust(1)} style={styles.qlBtn} accessibilityLabel={`Increase ${label}`}>
        <Plus size={18} color={COLORS.charcoalMed} />
      </TouchableOpacity>
    </View>
  );
}

interface QuickLogCardProps {
  weightToday: number | null;
  waistToday: number | null;
  latestWeight: number | null;
  latestWaist: number | null;
  onLogWeight: (v: number) => Promise<unknown> | void;
  onLogWaist: (v: number) => Promise<unknown> | void;
  subtitle?: string;
}

export function QuickLogCard({
  weightToday,
  waistToday,
  latestWeight,
  latestWaist,
  onLogWeight,
  onLogWaist,
  subtitle = 'Tap to log today — saves instantly',
}: QuickLogCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Quick Log</Text>
      <Text style={styles.cardSub}>{subtitle}</Text>
      <QuickLogRow
        label="Weight"
        icon={<TrendingDown size={16} color={COLORS.rosePrimary} />}
        value={weightToday}
        seed={latestWeight}
        unit="kg"
        step={0.1}
        fallback={65}
        decimals={1}
        accent={COLORS.rosePrimary}
        onCommit={onLogWeight}
      />
      <View style={styles.divider} />
      <QuickLogRow
        label="Waist"
        icon={<Flat size={16} color={COLORS.roseAccent} />}
        value={waistToday}
        seed={latestWaist}
        unit="cm"
        step={0.5}
        fallback={80}
        decimals={1}
        accent={COLORS.roseAccent}
        onCommit={onLogWaist}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Weekly progress summary (lives on the dashboard — no new analytics page).
// ---------------------------------------------------------------------------
function DeltaStat({ label, delta, unit }: { label: string; delta: number | null; unit: string }) {
  const down = delta != null && delta < 0;
  const up = delta != null && delta > 0;
  const color = delta == null ? COLORS.charcoalMuted : down ? COLORS.success : up ? COLORS.warning : COLORS.charcoalMed;
  const Icon = down ? TrendingDown : up ? TrendingUp : Flat;
  return (
    <View style={styles.statCol}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        {delta != null && <Icon size={14} color={color} />}
        <Text style={[styles.statValue, { color }]}>
          {delta == null ? '--' : `${Math.abs(delta)}`}
        </Text>
        {delta != null && <Text style={styles.statUnit}>{unit}</Text>}
      </View>
    </View>
  );
}

interface WeeklySummaryCardProps {
  weightDelta: number | null;
  waistDelta: number | null;
  avgHabitPct: number | null;
  daysLogged: number;
  loading?: boolean;
}

export function WeeklySummaryCard({
  weightDelta,
  waistDelta,
  avgHabitPct,
  daysLogged,
  loading,
}: WeeklySummaryCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.weekHeader}>
        <Text style={styles.cardTitle}>This Week</Text>
        <Text style={styles.weekDays}>{daysLogged}/7 days logged</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={COLORS.rosePrimary} style={{ marginVertical: SPACING.sm }} />
      ) : (
        <View style={styles.statsRow}>
          <DeltaStat label="Weight" delta={weightDelta} unit="kg" />
          <DeltaStat label="Waist" delta={waistDelta} unit="cm" />
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Habits</Text>
            <View style={styles.statValueRow}>
              <Text style={[styles.statValue, { color: COLORS.sageDark }]}>
                {avgHabitPct == null ? '--' : avgHabitPct}
              </Text>
              {avgHabitPct != null && <Text style={styles.statUnit}>%</Text>}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.card,
  },
  cardTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.charcoal,
  },
  cardSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.charcoalMuted,
    marginTop: 2,
    marginBottom: SPACING.sm,
  },
  qlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  qlIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qlLabelWrap: {
    flex: 1,
  },
  qlLabel: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.charcoal,
  },
  qlStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 14,
  },
  qlSaved: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.success,
  },
  qlBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.creamDark,
    borderWidth: 1,
    borderColor: COLORS.creamBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qlValueWrap: {
    minWidth: 64,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 2,
  },
  qlValue: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    letterSpacing: -0.5,
  },
  qlUnit: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.charcoalMuted,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.creamBorder,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  weekDays: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.charcoalMuted,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.charcoalMuted,
    marginBottom: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  statValue: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    letterSpacing: -0.5,
  },
  statUnit: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.charcoalMuted,
  },
});
