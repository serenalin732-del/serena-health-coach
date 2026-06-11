import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';

interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function ModalSheet({ visible, onClose, title, children }: ModalSheetProps) {
  const { t } = useI18n();
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeTxt}>{t('Done')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export function ScoreRing({ score, size = 80, strokeWidth = 7, color = COLORS.rosePrimary }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100) / 100;
  const dashOffset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={StyleSheet.absoluteFillObject}>
        {/* Background circle via border */}
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: COLORS.creamBorder,
            position: 'absolute',
          }}
        />
      </View>
      <Text style={[styles.ringScore, { fontSize: size * 0.26 }]}>{score}</Text>
      <Text style={[styles.ringLabel, { fontSize: size * 0.13 }]}>score</Text>
    </View>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  label?: string;
}

export function ProgressBar({ value, max = 100, color = COLORS.rosePrimary, height = 8, showLabel, label }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <View style={styles.progressWrap}>
      {(showLabel || label) && (
        <View style={styles.progressLabelRow}>
          {label && <Text style={styles.progressLabel}>{label}</Text>}
          {showLabel && <Text style={styles.progressPct}>{Math.round(pct)}%</Text>}
        </View>
      )}
      <View style={[styles.progressTrack, { height }]}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color, height }]} />
      </View>
    </View>
  );
}

interface TagProps {
  label: string;
  color?: string;
  bg?: string;
}

export function Tag({ label, color = COLORS.sageDark, bg = COLORS.sagePale }: TagProps) {
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: COLORS.overlay,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    maxHeight: '90%',
    ...SHADOW.cardMd,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.creamBorder,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.creamBorder,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 17,
    color: COLORS.charcoal,
  },
  closeBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  closeTxt: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.rosePrimary,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  ringScore: {
    fontFamily: FONTS.bold,
    color: COLORS.charcoal,
    lineHeight: undefined,
  },
  ringLabel: {
    fontFamily: FONTS.regular,
    color: COLORS.charcoalMuted,
  },
  progressWrap: {
    marginVertical: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.charcoalMed,
  },
  progressPct: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.charcoalMuted,
  },
  progressTrack: {
    backgroundColor: COLORS.creamDark,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: RADIUS.full,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  tagText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
});
