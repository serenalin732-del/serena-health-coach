import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Timer } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '@/lib/theme';
import { ProgressBar } from '@/components/UI';
import { useI18n } from '@/lib/i18n';

function toMin(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

function fmt(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

// Live 16:8 (or any) eating-window status. start/end are "HH:MM" local times,
// with the eating window during the day (start < end) and fasting overnight.
export function FastingCard({ start, end }: { start: string; end: string }) {
  const { t } = useI18n();
  const [now, setNow] = useState(nowMinutes);

  useEffect(() => {
    const id = setInterval(() => setNow(nowMinutes()), 30_000);
    return () => clearInterval(id);
  }, []);

  const s = toMin(start);
  const e = toMin(end);
  if (s == null || e == null || e <= s) return null;

  const eating = now >= s && now < e;
  const color = eating ? COLORS.sageDark : COLORS.roseAccent;

  let status: string;
  let detail: string;
  let value: number;
  let max: number;
  if (eating) {
    status = t('Eating window open');
    detail = t('closes in {x}', { x: fmt(e - now) });
    value = now - s;
    max = e - s;
  } else {
    const toStart = now < s ? s - now : 1440 - now + s;
    status = t('Fasting');
    detail = t('eat in {x}', { x: fmt(toStart) });
    max = 1440 - (e - s);
    value = now >= e ? now - e : 1440 - e + now;
  }

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Timer size={16} color={color} />
        <Text style={styles.title}>{t('16:8 Fasting')}</Text>
        <Text style={styles.window}>{start}–{end}</Text>
      </View>
      <Text style={[styles.status, { color }]}>{status} · {detail}</Text>
      <ProgressBar value={value} max={max} color={color} height={7} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.charcoal,
    flex: 1,
  },
  window: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: COLORS.charcoalMuted,
  },
  status: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    marginBottom: 8,
  },
});
