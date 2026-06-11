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
import { Plus, Trash2, Coffee, Sun, Moon, Apple, Sparkles, Camera, ChevronRight } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '@/lib/theme';
import { SectionCard } from '@/components/Cards';
import { ModalSheet } from '@/components/UI';
import { InputField, PrimaryButton } from '@/components/Inputs';
import { useMeals } from '@/hooks/useMeals';
import { useMealAnalysis, type MealEstimate } from '@/hooks/useMealAnalysis';
import { pickMealImage } from '@/lib/imagePicker';
import { useAuth } from '@/hooks/useAuth';
import { todayStr, sanitizeDecimalInput, parseNumericInput } from '@/lib/utils';
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
  const userId = user?.id ?? '';
  const today = todayStr();
  const { byType, totals, loading, addMeal, deleteMeal, refresh } = useMeals(userId, today);
  const [showAdd, setShowAdd] = useState(false);
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ food_name: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' });
  const [aiDesc, setAiDesc] = useState('');
  const [aiGrams, setAiGrams] = useState('');
  const [aiNote, setAiNote] = useState('');
  const analysis = useMealAnalysis();

  const openAdd = (type: MealType) => {
    setMealType(type);
    setForm({ food_name: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' });
    setAiDesc('');
    setAiGrams('');
    setAiNote('');
    setShowAdd(true);
  };

  const applyEstimate = (e: MealEstimate) => {
    setForm({
      food_name: e.food_name || aiDesc.trim(),
      calories: e.calories != null ? String(e.calories) : '',
      protein_g: e.protein_g != null ? String(e.protein_g) : '',
      carbs_g: e.carbs_g != null ? String(e.carbs_g) : '',
      fat_g: e.fat_g != null ? String(e.fat_g) : '',
    });
    setAiNote(e.note || '');
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
    await addMeal({
      log_date: today,
      meal_type: mealType,
      food_name: form.food_name.trim(),
      calories: parseNumericInput(form.calories),
      protein_g: parseNumericInput(form.protein_g),
      carbs_g: parseNumericInput(form.carbs_g),
      fat_g: parseNumericInput(form.fat_g),
      notes: null,
    });
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
          <Text style={styles.pageTitle}>Nutrition</Text>
          <Text style={styles.pageDate}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
        </View>

        {/* Totals Banner */}
        <View style={styles.totalsBanner}>
          <MacroChip label="Calories" value={Math.round(totals.calories)} unit="kcal" color={COLORS.rosePrimary} />
          <MacroChip label="Protein" value={Math.round(totals.protein)} unit="g" color={COLORS.sageDark} />
          <MacroChip label="Carbs" value={Math.round(totals.carbs)} unit="g" color={COLORS.warning} />
          <MacroChip label="Fat" value={Math.round(totals.fat)} unit="g" color={COLORS.roseAccent} />
        </View>

        {/* AI Meal Analysis entry point */}
        <TouchableOpacity style={styles.aiCard} activeOpacity={0.8} onPress={() => openAdd('snack')}>
          <Sparkles size={18} color={COLORS.rosePrimary} />
          <View style={{ flex: 1, marginLeft: SPACING.sm }}>
            <Text style={styles.aiTitle}>AI Meal Analysis</Text>
            <Text style={styles.aiSub}>Don't know the calories? Snap a photo or describe a meal and AI estimates it.</Text>
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
            onDelete={deleteMeal}
          />
        ))}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      <ModalSheet visible={showAdd} onClose={() => setShowAdd(false)} title={`Add ${MEAL_CONFIG[mealType].label}`}>
        {/* AI estimate */}
        <View style={styles.aiBlock}>
          <View style={styles.aiBlockHead}>
            <Sparkles size={15} color={COLORS.rosePrimary} />
            <Text style={styles.aiBlockTitle}>Estimate with AI</Text>
          </View>
          <InputField
            label="Describe the food (optional)"
            value={aiDesc}
            onChangeText={setAiDesc}
            placeholder="e.g. bowl of oatmeal with a banana"
          />
          <InputField
            label="Approx. amount (optional)"
            value={aiGrams}
            onChangeText={v => setAiGrams(sanitizeDecimalInput(v))}
            keyboardType="decimal-pad"
            unit="g"
            placeholder="e.g. 250"
          />
          <View style={styles.aiButtons}>
            <PrimaryButton label="Estimate" onPress={estimateFromText} loading={analysis.loading} variant="secondary" style={styles.aiBtn} />
            <TouchableOpacity onPress={estimateFromPhoto} disabled={analysis.loading} style={styles.photoBtn} activeOpacity={0.8}>
              <Camera size={16} color={COLORS.sageDark} />
              <Text style={styles.photoBtnText}>Photo</Text>
            </TouchableOpacity>
          </View>
          {analysis.error && <Text style={styles.aiError}>{analysis.error}</Text>}
          {aiNote ? <Text style={styles.aiNote}>{aiNote} — adjust the numbers below if needed.</Text> : null}
        </View>

        <InputField
          label="Food Name"
          value={form.food_name}
          onChangeText={v => setForm(f => ({ ...f, food_name: v }))}
          placeholder="e.g. Greek Yogurt"
          autoCapitalize="words"
        />
        <InputField
          label="Calories"
          value={form.calories}
          onChangeText={v => setForm(f => ({ ...f, calories: sanitizeDecimalInput(v) }))}
          keyboardType="decimal-pad"
          unit="kcal"
          placeholder="e.g. 150"
        />
        <InputField
          label="Protein"
          value={form.protein_g}
          onChangeText={v => setForm(f => ({ ...f, protein_g: sanitizeDecimalInput(v) }))}
          keyboardType="decimal-pad"
          unit="g"
          placeholder="e.g. 17"
        />
        <InputField
          label="Carbohydrates"
          value={form.carbs_g}
          onChangeText={v => setForm(f => ({ ...f, carbs_g: sanitizeDecimalInput(v) }))}
          keyboardType="decimal-pad"
          unit="g"
          placeholder="e.g. 8"
        />
        <InputField
          label="Fat"
          value={form.fat_g}
          onChangeText={v => setForm(f => ({ ...f, fat_g: sanitizeDecimalInput(v) }))}
          keyboardType="decimal-pad"
          unit="g"
          placeholder="e.g. 4"
        />
        <PrimaryButton label="Add Food" onPress={handleAdd} loading={saving} />
      </ModalSheet>
    </SafeAreaView>
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

function MealSection({ type, meals, onAdd, onDelete }: { type: MealType; meals: MealLog[]; onAdd: () => void; onDelete: (id: string) => void }) {
  const config = MEAL_CONFIG[type];
  const mealTotal = meals.reduce((a, m) => a + (m.calories ?? 0), 0);

  return (
    <SectionCard
      title={config.label}
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
          <Text style={styles.emptyMealText}>Tap + to add {config.label.toLowerCase()}</Text>
        </TouchableOpacity>
      ) : (
        meals.map(meal => (
          <View key={meal.id} style={styles.mealRow}>
            <View style={[styles.mealIcon, { backgroundColor: config.bg }]}>{config.icon}</View>
            <View style={styles.mealInfo}>
              <Text style={styles.mealName}>{meal.food_name}</Text>
              <View style={styles.mealMacros}>
                {meal.calories != null && <Text style={styles.mealMacro}>{Math.round(meal.calories)} kcal</Text>}
                {meal.protein_g != null && <Text style={styles.mealMacro}>P {Math.round(meal.protein_g)}g</Text>}
                {meal.carbs_g != null && <Text style={styles.mealMacro}>C {Math.round(meal.carbs_g)}g</Text>}
                {meal.fat_g != null && <Text style={styles.mealMacro}>F {Math.round(meal.fat_g)}g</Text>}
              </View>
            </View>
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
