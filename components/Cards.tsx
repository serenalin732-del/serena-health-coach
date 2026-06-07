import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '@/lib/theme';

interface MetricCardProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  icon?: React.ReactNode;
  accent?: string;
  style?: ViewStyle;
  valueStyle?: TextStyle;
  subValue?: string;
}

export function MetricCard({ label, value, unit, icon, accent, style, valueStyle, subValue }: MetricCardProps) {
  const displayVal = value !== null && value !== undefined ? String(value) : '--';
  return (
    <View style={[styles.card, style]}>
      {icon && (
        <View style={[styles.iconWrap, { backgroundColor: accent ? accent + '22' : COLORS.sagePale }]}>
          {icon}
        </View>
      )}
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, valueStyle]}>{displayVal}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      {subValue && <Text style={styles.subValue}>{subValue}</Text>}
    </View>
  );
}

interface SectionCardProps {
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  rightHeader?: React.ReactNode;
}

export function SectionCard({ title, children, style, rightHeader }: SectionCardProps) {
  return (
    <View style={[styles.sectionCard, style]}>
      {(title || rightHeader) && (
        <View style={styles.sectionHeader}>
          {title && <Text style={styles.sectionTitle}>{title}</Text>}
          {rightHeader}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOW.card,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  label: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.charcoalMuted,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  value: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.charcoal,
    letterSpacing: -0.5,
  },
  unit: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.charcoalMuted,
  },
  subValue: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.charcoalMuted,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.charcoal,
  },
});
