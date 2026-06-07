import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { Svg, Polyline, Line, Text as SvgText, Circle, Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { COLORS, FONTS, SPACING, RADIUS } from '@/lib/theme';
import type { TrendDataPoint } from '@/hooks/useTrends';
import { formatDisplayDate } from '@/lib/utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_PADDING = 40;

interface LineChartProps {
  data: TrendDataPoint[];
  color?: string;
  label?: string;
  unit?: string;
  loading?: boolean;
  gradientId?: string;
}

export function LineChart({ data, color = COLORS.rosePrimary, label, unit, loading, gradientId = 'grad1' }: LineChartProps) {
  const chartWidth = SCREEN_WIDTH - SPACING.md * 4;
  const chartHeight = 160;
  const padLeft = 44;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 32;
  const innerW = chartWidth - padLeft - padRight;
  const innerH = chartHeight - padTop - padBottom;

  if (loading) {
    return (
      <View style={[styles.chartWrap, { height: chartHeight + 40 }]}>
        <ActivityIndicator color={COLORS.rosePrimary} />
      </View>
    );
  }

  const validData = data.filter(d => d.value !== null && d.value !== undefined) as { date: string; value: number }[];

  if (validData.length === 0) {
    return (
      <View style={[styles.chartWrap, { height: chartHeight + 40 }]}>
        <Text style={styles.emptyText}>No data yet</Text>
      </View>
    );
  }

  const values = validData.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const points = validData.map((d, i) => {
    const x = padLeft + (i / Math.max(validData.length - 1, 1)) * innerW;
    const y = padTop + (1 - (d.value - minVal) / range) * innerH;
    return { x, y, date: d.date, value: d.value };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath = points.length > 0
    ? `M${points[0].x},${padTop + innerH} ${points.map(p => `L${p.x},${p.y}`).join(' ')} L${points[points.length - 1].x},${padTop + innerH} Z`
    : '';

  const yTicks = 4;
  const xLabelStep = Math.ceil(validData.length / 4);

  return (
    <View style={styles.chartWrap}>
      {label && <Text style={styles.chartLabel}>{label}{unit ? ` (${unit})` : ''}</Text>}
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.2" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {Array.from({ length: yTicks }).map((_, i) => {
          const y = padTop + (i / (yTicks - 1)) * innerH;
          const val = maxVal - (i / (yTicks - 1)) * range;
          return (
            <React.Fragment key={i}>
              <Line x1={padLeft} y1={y} x2={padLeft + innerW} y2={y} stroke={COLORS.creamBorder} strokeWidth="1" />
              <SvgText x={padLeft - 4} y={y + 4} fontSize="10" fill={COLORS.charcoalMuted} textAnchor="end" fontFamily={FONTS.regular}>
                {val.toFixed(range < 5 ? 1 : 0)}
              </SvgText>
            </React.Fragment>
          );
        })}
        {areaPath && <Path d={areaPath} fill={`url(#${gradientId})`} />}
        <Polyline points={polylinePoints} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => i % xLabelStep === 0 && (
          <React.Fragment key={i}>
            <Circle cx={p.x} cy={p.y} r="3.5" fill={color} />
            <SvgText x={p.x} y={chartHeight - 4} fontSize="9.5" fill={COLORS.charcoalMuted} textAnchor="middle" fontFamily={FONTS.regular}>
              {formatDisplayDate(p.date)}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

interface BarChartProps {
  data: TrendDataPoint[];
  color?: string;
  label?: string;
  unit?: string;
  maxValue?: number;
  loading?: boolean;
}

export function BarChart({ data, color = COLORS.sage, label, unit, maxValue, loading }: BarChartProps) {
  const chartWidth = SCREEN_WIDTH - SPACING.md * 4;
  const chartHeight = 160;
  const padLeft = 44;
  const padRight = 8;
  const padTop = 16;
  const padBottom = 32;
  const innerW = chartWidth - padLeft - padRight;
  const innerH = chartHeight - padTop - padBottom;

  if (loading) {
    return (
      <View style={[styles.chartWrap, { height: chartHeight + 40 }]}>
        <ActivityIndicator color={COLORS.sage} />
      </View>
    );
  }

  const validData = data.filter(d => d.value !== null);

  if (validData.length === 0) {
    return (
      <View style={[styles.chartWrap, { height: chartHeight + 40 }]}>
        <Text style={styles.emptyText}>No data yet</Text>
      </View>
    );
  }

  const values = validData.map(d => d.value as number);
  const maxVal = maxValue ?? Math.max(...values, 1);
  const barWidth = Math.max(4, (innerW / validData.length) - 3);
  const xLabelStep = Math.ceil(validData.length / 4);

  return (
    <View style={styles.chartWrap}>
      {label && <Text style={styles.chartLabel}>{label}{unit ? ` (${unit})` : ''}</Text>}
      <Svg width={chartWidth} height={chartHeight}>
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = padTop + (1 - tick / 100) * innerH;
          return (
            <React.Fragment key={tick}>
              <Line x1={padLeft} y1={y} x2={padLeft + innerW} y2={y} stroke={COLORS.creamBorder} strokeWidth="1" />
              <SvgText x={padLeft - 4} y={y + 4} fontSize="10" fill={COLORS.charcoalMuted} textAnchor="end" fontFamily={FONTS.regular}>
                {Math.round((tick / 100) * maxVal)}
              </SvgText>
            </React.Fragment>
          );
        })}
        {validData.map((d, i) => {
          const x = padLeft + (i / validData.length) * innerW + (innerW / validData.length - barWidth) / 2;
          const barH = ((d.value as number) / maxVal) * innerH;
          const y = padTop + innerH - barH;
          return (
            <React.Fragment key={i}>
              <Rect x={x} y={y} width={barWidth} height={barH} fill={color} rx="3" opacity={0.85} />
              {i % xLabelStep === 0 && (
                <SvgText x={x + barWidth / 2} y={chartHeight - 4} fontSize="9.5" fill={COLORS.charcoalMuted} textAnchor="middle" fontFamily={FONTS.regular}>
                  {formatDisplayDate(d.date)}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  chartLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.charcoalMed,
    alignSelf: 'flex-start',
    marginBottom: SPACING.xs,
    paddingLeft: SPACING.xs,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.charcoalMuted,
  },
});
