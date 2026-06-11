import React from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '@/lib/theme';
import { useI18n } from '@/lib/i18n';

interface InputFieldProps extends TextInputProps {
  label: string;
  unit?: string;
  containerStyle?: ViewStyle;
  error?: string;
}

export function InputField({ label, unit, containerStyle, error, ...props }: InputFieldProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={COLORS.charcoalMuted}
          {...props}
        />
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function PrimaryButton({ label, onPress, loading, disabled, style, variant = 'primary' }: PrimaryButtonProps) {
  const { t } = useI18n();
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.btn,
        variant === 'primary' && styles.btnPrimary,
        variant === 'secondary' && styles.btnSecondary,
        variant === 'ghost' && styles.btnGhost,
        isDisabled && styles.btnDisabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.btnText,
          variant === 'primary' && styles.btnTextPrimary,
          variant === 'secondary' && styles.btnTextSecondary,
          variant === 'ghost' && styles.btnTextGhost,
        ]}
      >
        {loading ? t('Saving...') : label}
      </Text>
    </TouchableOpacity>
  );
}

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.charcoalMed,
    marginBottom: SPACING.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.creamDark,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.creamBorder,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.charcoal,
    padding: 0,
  },
  unit: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.charcoalMuted,
    marginLeft: SPACING.xs,
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: COLORS.rosePrimary,
  },
  btnSecondary: {
    backgroundColor: COLORS.sagePale,
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.creamBorder,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
  },
  btnTextPrimary: {
    color: COLORS.white,
  },
  btnTextSecondary: {
    color: COLORS.sageDark,
  },
  btnTextGhost: {
    color: COLORS.charcoalMed,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.creamDark,
    borderWidth: 1,
    borderColor: COLORS.creamBorder,
  },
  chipSelected: {
    backgroundColor: COLORS.rosePrimary,
    borderColor: COLORS.rosePrimary,
  },
  chipText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.charcoalMed,
  },
  chipTextSelected: {
    color: COLORS.white,
  },
});
