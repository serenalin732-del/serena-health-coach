import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Plus, Trash2, Coffee, Sun, Moon, Apple, Sparkles, Camera, ChevronRight, ChevronLeft } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '@/lib/theme';
import { SectionCard } from '@/components/Cards';
import { ModalSheet, ProgressBar } from '@/components/UI';
import { InputField, PrimaryButton } from '@/components/Inputs';
import { useMeals } from '@/hooks/useMeals';
import { useNutritionTargets, type NutritionTargets } from '@/hooks/useNutritionTargets';
import { useMealAnalysis, type MealEstimate } from '@/hooks/useMealAnalysis';
import { useCoach } from '@/hooks/useCoach';
import { CoachCard } from '@/components/CoachCard';
import { pickMealImage } from '@/lib/imagePicker';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { todayStr, shiftDate, formatDisplayDate, sanitizeDecimalInput, parseNumericInput } from '@/lib/utils';
import type { MealLog } from '@/lib/types';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_CONFIG: Record<MealType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  breakfast: { label: 'Breakfast', icon: <Coffee size={18} color={COLORS.warning} />, color: COLORS.warning, bg: COLORS.warningLight },
  lunch: { label: 'Lunch', icon: <Sun size={18} color={COLORS.rosePrimary} />, color: COLORS.rosePrimary, bg: COLORS.roseBeigeLight },
  dinner: { label: 'Dinner', icon: <Moon size={18} color={COLORS.sageDark} />, color: COLORS.sageDark, bg: COLORS.sagePale },
  snack: { label: 'Snack', icon: <Apple size={18} color={COLORS.roseBeige} />, color: COLORS.roseBeige, bg: COLORS.creamDark },
};

export default function FoodScreen() {
  const { user } = useAuth();
  const { t } = useI18n();
  const userId = user?.id ?? '';
  // The day being viewed/edited; ◀ ▶ moves between days to fix past meals.
  const [viewDate, setViewDate] = useState(todayStr());
  const isToday = viewDate === todayStr();
  const { byType, totals, loading, addMeal, updateMeal, deleteMeal, refresh } = useMeals(userId, viewDate);
  const { targets, hasTargets } = useNutritionTargets(userId);
  const [showAdd, setShowAdd] = useState(false);
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ food_name: '', grams: '', calories: '', protein_g: '', carbs_g: '', fat_g: '', healthy_fat_g: '', veg_servings: '' });
  // Per-100g nutrition for the identified food. While set, editing grams scales
  // every macro precisely (macro = per100g × grams / 100).
  const [per100, setPer100] = useState<null | { calories: number; protein_g: number; carbs_g: number; fat_g: number; healthy_fat_g: number; veg_servings: number }>(null);
  const [aiDesc, setAiDesc] = useState('');
  const [aiGrams, setAiGrams] = useState('');
  const [aiNote, setAiNote] = useState('');
  const analysis = useMealAnalysis();
  const foodCoach = useCoach('food-coach');

  const openAdd = (type: MealType) => {
    setMealType(type);
    setEditingId(null);
    setForm({ food_name: '', grams: '', calories: '', protein_g: '', carbs_g: '', fat_g: '', healthy_fat_g: '', veg_servings: '' });
    setPer100(null);
    setAiDesc('');
    setAiGrams('');
    setAiNote('');
    setShowAdd(true);
  };

  const openEdit = (meal: MealLog) => {
    const s = (n: number | null) => (n != null ? String(n) : '');
    setMealType(meal.meal_type);
    setEditingId(meal.id);
    setForm({
      food_name: meal.food_name,
      grams: s(meal.grams),
      calories: s(meal.calories),
      protein_g: s(meal.protein_g),
      carbs_g: s(meal.carbs_g),
      fat_g: s(meal.fat_g),
      healthy_fat_g: s(meal.healthy_fat_g),
      veg_servings: s(meal.veg_servings),
    });
    setPer100(null); // editing existing values directly, no rescale
    setAiDesc('');
    setAiGrams('');
    setAiNote('');
    setShowAdd(true);
  };

  const applyEstimate = (e: MealEstimate) => {
    const s = (n: number | null) => (n != null ? String(n) : '');
    const g = e.grams != null && e.grams > 0 ? e.grams : null;
    // Derive per-100g so the grams field can scale everything precisely.
    setPer100(
      g
        ? {
            calories: (e.calories ?? 0) / g * 100,
            protein_g: (e.protein_g ?? 0) / g * 100,
            carbs_g: (e.carbs_g ?? 0) / g * 100,
            fat_g: (e.fat_g ?? 0) / g * 100,
            healthy_fat_g: (e.healthy_fat_g ?? 0) / g * 100,
            veg_servings: (e.veg_servings ?? 0) / g * 100,
          }
        : null
    );
    setForm({
      food_name: e.food_name || aiDesc.trim(),
      grams: g ? String(g) : '',
      calories: s(e.calories),
      protein_g: s(e.protein_g),
      carbs_g: s(e.carbs_g),
      fat_g: s(e.fat_g),
      healthy_fat_g: s(e.healthy_fat_g),
      veg_servings: s(e.veg_servings),
    });
    setAiNote(e.note || '');
  };

  // Editing grams rescales macros from the per-100g basis (exact arithmetic).
  const onGramsChange = (raw: string) => {
    const grams = sanitizeDecimalInput(raw);
    setForm(f => {
      if (!per100) return { ...f, grams };
      const g = parseFloat(grams);
      if (!Number.isFinite(g) || g <= 0) return { ...f, grams };
      const r = (v: number) => String(Math.round(v * g / 100));
      const r1 = (v: number) => String(Math.round(v * g / 100 * 10) / 10);
      return {
        ...f,
        grams,
        calories: r(per100.calories),
        protein_g: r(per100.protein_g),
        carbs_g: r(per100.carbs_g),
        fat_g: r(per100.fat_g),
        healthy_fat_g: r(per100.healthy_fat_g),
        veg_servings: r1(per100.veg_servings),
      };
    });
  };

  // Manually editing a macro means it's no longer a pure per-100g scale.
  const editMacro = (key: 'calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'healthy_fat_g' | 'veg_servings', v: string) => {
    setPer100(null);
    setForm(f => ({ ...f, [key]: sanitizeDecimalInput(v) }));
  };

  const estimateFromText = async () => {
    const result = await analysis.analyze({
      meal_type: mealType,
      description: aiDesc.trim() || undefined,
      grams: aiGrams ? Number(aiGrams) : undefined,
    });
    if (result) applyEstimate(result);
  };

  const estimateFromPhoto = async () => {
    const image = await pickMealImage();
    if (!image) return; // cancelled or unsupported
    const result = await analysis.analyze({
      meal_type: mealType,
      description: aiDesc.trim() || undefined,
      grams: aiGrams ? Number(aiGrams) : undefined,
      image,
    });
    if (result) applyEstimate(result);
  };

  const handleAdd = async () => {
    if (!form.food_name.trim()) return;
    setSaving(true);
    const fields = {
      meal_type: mealType,
      food_name: form.food_name.trim(),
      grams: parseNumericInput(form.grams),
      calories: parseNumericInput(form.calories),
      protein_g: parseNumericInput(form.protein_g),
      carbs_g: parseNumericInput(form.carbs_g),
      fat_g: parseNumericInput(form.fat_g),
      healthy_fat_g: parseNumericInput(form.healthy_fat_g),
      veg_servings: parseNumericInput(form.veg_servings),
    };
    if (editingId) {
      await updateMeal(editingId, fields);
    } else {
      await addMeal({ log_date: viewDate, notes: null, ...fields });
    }
    setSaving(false);
    setShowAdd(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.rosePrimary} />}
      >
        <View style={styles.header}>
          <Text style={styles.pageTitle}>{t('Nutrition')}</Text>
          <View style={styles.dateNav}>
            <TouchableOpacity
              onPress={() => setViewDate(d => shiftDate(d, -1))}
              style={styles.dateNavBtn}
              accessibilityLabel="Previous day"
            >
              <ChevronLeft size={18} color={COLORS.charcoalMed} />
            </TouchableOpacity>
            <Text style={styles.pageDate}>{isToday ? t('Today') : formatDisplayDate(viewDate)}</Text>
            <TouchableOpacity
              onPress={() => setViewDate(d => shiftDate(d, 1))}
              style={styles.dateNavBtn}
              disabled={isToday}
              accessibilityLabel="Next day"
            >
              <ChevronRight size={18} color={isToday ? COLORS.creamBorder : COLORS.charcoalMed} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Totals Banner */}
        <View style={styles.totalsBanner}>
          <MacroChip label={t('Calories')} value={Math.round(totals.calories)} unit="kcal" color={COLORS.rosePrimary} />
          <MacroChip label={t('Protein')} value={Math.round(totals.protein)} unit="g" color={COLORS.sageDark} />
          <MacroChip label={t('Carbs')} value={Math.round(totals.carbs)} unit="g" color={COLORS.warning} />
          <MacroChip label={t('Good Fat')} value={Math.round(totals.healthyFat)} unit="g" color={COLORS.roseAccent} />
        </View>

        {/* Daily targets progress */}
        {hasTargets ? (
          <View style={styles.targetsCard}>
            <Text style={styles.targetsTitle}>{t("Today's Target")}</Text>
            <TargetRow label={t('Calories')} consumed={totals.calories} target={targets.target_calories} unit="kcal" color={COLORS.rosePrimary} t={t} />
            <TargetRow label={t('Protein')} consumed={totals.protein} target={targets.target_protein_g} unit="g" color={COLORS.sageDark} t={t} />
            <TargetRow label={t('Carbs')} consumed={totals.carbs} target={targets.target_carbs_g} unit="g" color={COLORS.warning} t={t} />
            <TargetRow label={t('Good Fat')} consumed={totals.healthyFat} target={targets.target_fat_g} unit="g" color={COLORS.roseAccent} t={t} />
            <TargetRow label={t('Vegetables')} consumed={totals.veg} target={targets.target_veg_servings} unit={t('servings')} color={COLORS.sage} t={t} />
          </View>
        ) : (
          <Text style={styles.targetsHint}>{t('Set daily targets in Settings → Nutrition Targets to track progress here.')}</Text>
        )}

        {/* Nutrition coach — advice for the rest of today */}
        {isToday && (
          <CoachCard
            coaching={foodCoach.coaching}
            loading={foodCoach.loading}
            error={foodCoach.error}
            configured={foodCoach.configured}
            onGenerate={foodCoach.generate}
            title={t('Nutrition Coach')}
            subtitle={t('Get advice on what to eat next to hit your targets today.')}
            loadingText={t('Reading your day…')}
            ctaLabel={t('Coach my eating')}
          />
        )}

        {/* AI Meal Analysis entry point */}
        <TouchableOpacity style={styles.aiCard} activeOpacity={0.8} onPress={() => openAdd('snack')}>
          <Sparkles size={18} color={COLORS.rosePrimary} />
          <View style={{ flex: 1, marginLeft: SPACING.sm }}>
            <Text style={styles.aiTitle}>{t('AI Meal Analysis')}</Text>
            <Text style={styles.aiSub}>{t("Don't know the calories? Snap a photo or describe a meal and AI estimates it.")}</Text>
          </View>
          <ChevronRight size={18} color={COLORS.roseAccent} />
        </TouchableOpacity>

        {/* Meal Sections */}
        {(Object.keys(MEAL_CONFIG) as MealType[]).map(type => (
          <MealSection
            key={type}
            type={type}
            meals={byType[type]}
            onAdd={() => openAdd(type)}
            onEdit={openEdit}
            onDelete={deleteMeal}
          />
        ))}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      <ModalSheet visible={showAdd} onClose={() => setShowAdd(false)} title={editingId ? t('Edit Food') : t('Add {x}', { x: t(MEAL_CONFIG[mealType].label) })}>
        {/* AI estimate */}
        <View style={styles.aiBlock}>
          <View style={styles.aiBlockHead}>
            <Sparkles size={15} color={COLORS.rosePrimary} />
            <Text style={styles.aiBlockTitle}>{t('Estimate with AI')}</Text>
          </View>
          <InputField
            label={t('Describe the food (optional)')}
            value={aiDesc}
            onChangeText={setAiDesc}
            placeholder={t('e.g. bowl of oatmeal with a banana')}
          />
          <InputField
            label={t('Approx. amount (optional)')}
            value={aiGrams}
            onChangeText={v => setAiGrams(sanitizeDecimalInput(v))}
            keyboardType="decimal-pad"
            unit="g"
            placeholder="e.g. 250"
          />
          <View style={styles.aiButtons}>
            <PrimaryButton label={t('Estimate')} onPress={estimateFromText} loading={analysis.loading} variant="secondary" style={styles.aiBtn} />
            <TouchableOpacity onPress={estimateFromPhoto} disabled={analysis.loading} style={styles.photoBtn} activeOpacity={0.8}>
              <Camera size={16} color={COLORS.sageDark} />
              <Text style={styles.photoBtnText}>{t('Photo')}</Text>
            </TouchableOpacity>
          </View>
          {analysis.error && <Text style={styles.aiError}>{t(analysis.error)}</Text>}
          {aiNote ? <Text style={styles.aiNote}>{aiNote} — {t('adjust the numbers below if needed.')}</Text> : null}
        </View>

        <InputField
          label={t('Food Name')}
          value={form.food_name}
          onChangeText={v => setForm(f => ({ ...f, food_name: v }))}
          placeholder={t('e.g. Greek Yogurt')}
          autoCapitalize="words"
        />
        <InputField
          label={t('Amount')}
          value={form.grams}
          onChangeText={onGramsChange}
          keyboardType="decimal-pad"
          unit="g"
          placeholder="e.g. 150"
        />
        {per100 ? <Text style={styles.aiNote}>{t('Calories & macros scale exactly with the grams above.')}</Text> : null}
        <InputField
          label={t('Calories')}
          value={form.calories}
          onChangeText={v => editMacro('calories', v)}
          keyboardType="decimal-pad"
          unit="kcal"
          placeholder="e.g. 150"
        />
        <InputField
          label={t('Protein')}
          value={form.protein_g}
          onChangeText={v => editMacro('protein_g', v)}
          keyboardType="decimal-pad"
          unit="g"
          placeholder="e.g. 17"
        />
        <InputField
          label={t('Carbohydrates')}
          value={form.carbs_g}
          onChangeText={v => editMacro('carbs_g', v)}
          keyboardType="decimal-pad"
          unit="g"
          placeholder="e.g. 8"
        />
        <InputField
          label={t('Fat')}
          value={form.fat_g}
          onChangeText={v => editMacro('fat_g', v)}
          keyboardType="decimal-pad"
          unit="g"
          placeholder="e.g. 4"
        />
        <InputField
          label={t('Good Fat')}
          value={form.healthy_fat_g}
          onChangeText={v => editMacro('healthy_fat_g', v)}
          keyboardType="decimal-pad"
          unit="g"
          placeholder="e.g. 3"
        />
        <InputField
          label={t('Vegetables')}
          value={form.veg_servings}
          onChangeText={v => editMacro('veg_servings', v)}
          keyboardType="decimal-pad"
          unit={t('servings')}
          placeholder="e.g. 1"
        />
        <PrimaryButton label={editingId ? t('Save') : t('Add Food')} onPress={handleAdd} loading={saving} />
      </ModalSheet>
    </SafeAreaView>
  );
}

function TargetRow({ label, consumed, target, unit, color, t }: { label: string; consumed: number; target: number | null; unit: string; color: string; t: (k: string, p?: Record<string, string | number>) => string }) {
  if (!target || target <= 0) return null;
  const done = Math.round(consumed);
  const remaining = Math.round(target - consumed);
  const over = remaining < 0;
  return (
    <View style={styles.targetRow}>
      <View style={styles.targetTop}>
        <Text style={styles.targetLabel}>{label}</Text>
        <Text style={styles.targetNums}>
          <Text style={{ color, fontFamily: FONTS.semiBold }}>{done}</Text>
          <Text style={styles.targetMuted}> / {Math.round(target)} {unit} · </Text>
          <Text style={{ color: over ? COLORS.error : COLORS.charcoalMed }}>
            {over ? t('over {x}', { x: Math.abs(remaining) }) : t('{x} left', { x: remaining })}
          </Text>
        </Text>
      </View>
      <ProgressBar value={consumed} max={target} color={over ? COLORS.error : color} height={7} />
    </View>
  );
}

function MacroChip({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={styles.macroChip}>
      <Text style={[styles.macroValue, { color }]}>{value}</Text>
      <Text style={styles.macroUnit}>{unit}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

function MealSection({ type, meals, onAdd, onEdit, onDelete }: { type: MealType; meals: MealLog[]; onAdd: () => void; onEdit: (m: MealLog) => void; onDelete: (id: string) => void }) {
  const { t } = useI18n();
  const config = MEAL_CONFIG[type];
  const mealTotal = meals.reduce((a, m) => a + (m.calories ?? 0), 0);

  return (
    <SectionCard
      title={t(config.label)}
      rightHeader={
        <View style={styles.mealHeaderRight}>
          {mealTotal > 0 && <Text style={styles.mealCalTotal}>{Math.round(mealTotal)} kcal</Text>}
          <TouchableOpacity onPress={onAdd} style={[styles.addBtn, { backgroundColor: config.bg }]}>
            <Plus size={16} color={config.color} />
          </TouchableOpacity>
        </View>
      }
    >
      {meals.length === 0 ? (
        <TouchableOpacity onPress={onAdd} style={styles.emptyMeal}>
          <Text style={styles.emptyMealText}>{t('Tap + to add {x}', { x: t(config.label) })}</Text>
        </TouchableOpacity>
      ) : (
        meals.map(meal => (
          <View key={meal.id} style={styles.mealRow}>
            <View style={[styles.mealIcon, { backgroundColor: config.bg }]}>{config.icon}</View>
            <TouchableOpacity style={styles.mealInfo} onPress={() => onEdit(meal)} activeOpacity={0.6}>
              <Text style={styles.mealName}>{meal.food_name}</Text>
              <View style={styles.mealMacros}>
                {meal.grams != null && <Text style={styles.mealMacro}>{Math.round(meal.grams)}g</Text>}
                {meal.calories != null && <Text style={styles.mealMacro}>{Math.round(meal.calories)} kcal</Text>}
                {meal.protein_g != null && <Text style={styles.mealMacro}>P {Math.round(meal.protein_g)}g</Text>}
                {meal.carbs_g != null && <Text style={styles.mealMacro}>C {Math.round(meal.carbs_g)}g</Text>}
                {meal.fat_g != null && <Text style={styles.mealMacro}>F {Math.round(meal.fat_g)}g</Text>}
                {meal.healthy_fat_g != null && <Text style={[styles.mealMacro, { color: COLORS.roseAccent }]}>{t('GF')} {Math.round(meal.healthy_fat_g)}g</Text>}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(meal.id)} style={styles.deleteBtn}>
              <Trash2 size={16} color={COLORS.charcoalMuted} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cream },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  pageDate: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.charcoalMuted,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dateNavBtn: {
    padding: 6,
  },
  totalsBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.card,
    justifyContent: 'space-between',
  },
  macroChip: {
    alignItems: 'center',
    flex: 1,
  },
  macroValue: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    letterSpacing: -0.5,
  },
  macroUnit: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.charcoalMuted,
  },
  macroLabel: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: COLORS.charcoalMuted,
    marginTop: 2,
  },
  targetsCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.card,
  },
  targetsTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.charcoal,
    marginBottom: SPACING.sm,
  },
  targetRow: {
    marginBottom: SPACING.sm,
  },
  targetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  targetLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.charcoalMed,
  },
  targetNums: {
    fontFamily: FONTS.regular,
    fontSize: 12,
  },
  targetMuted: {
    color: COLORS.charcoalMuted,
  },
  targetsHint: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.charcoalMuted,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  aiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.roseBeigeLight,
    marginHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.roseBeige,
  },
  aiTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.roseAccent,
  },
  aiSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.charcoalMuted,
    marginTop: 2,
  },
  aiBlock: {
    backgroundColor: COLORS.roseBeigeLight,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.roseBeige,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  aiBlockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  aiBlockTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.roseAccent,
  },
  aiButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  aiBtn: {
    flex: 1,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.sagePale,
    borderRadius: RADIUS.xxl,
    paddingVertical: 14,
  },
  photoBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.sageDark,
  },
  aiError: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.error,
    marginTop: SPACING.sm,
  },
  aiNote: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.charcoalMed,
    marginTop: SPACING.sm,
  },
  mealHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  mealCalTotal: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: COLORS.charcoalMuted,
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMeal: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  emptyMealText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.charcoalMuted,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.creamBorder,
    gap: SPACING.sm,
  },
  mealIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.charcoal,
  },
  mealMacros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  mealMacro: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.charcoalMuted,
  },
  deleteBtn: {
    padding: SPACING.xs,
  },
});
