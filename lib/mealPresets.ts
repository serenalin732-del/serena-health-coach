// Preset meals & add-ons from Serena's high-protein fat-loss plan (V2.0), so a
// meal can be logged in one tap with macros pre-filled. Weights are RAW. Macros
// match the plan card; grams is null for composite dishes (no single weight to
// scale by). healthy_fat = deliberate healthy-fat sources (oils, oily fish,
// avocado, nuts).
export interface MealPreset {
  key: string;
  en: string;
  zh: string;
  group: 'main' | 'veg' | 'protein' | 'fat' | 'carb';
  grams: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  healthy_fat: number;
  veg: number;
}

export const MEAL_PRESETS: MealPreset[] = [
  // Main meals
  { key: 'chicken', en: 'Chicken breast meal', zh: '鸡胸肉餐', group: 'main', grams: 250, calories: 420, protein: 57, carbs: 0, fat: 9, healthy_fat: 5, veg: 0 },
  { key: 'salmon', en: 'Salmon meal', zh: '三文鱼餐', group: 'main', grams: 180, calories: 470, protein: 44, carbs: 0, fat: 26, healthy_fat: 24, veg: 0 },
  { key: 'shrimp', en: 'Shrimp meal', zh: '虾仁餐', group: 'main', grams: 250, calories: 360, protein: 60, carbs: 0, fat: 7, healthy_fat: 5, veg: 0 },
  { key: 'sardine_chicken', en: 'Sardines + chicken', zh: '沙丁鱼+鸡胸', group: 'main', grams: null, calories: 410, protein: 59, carbs: 0, fat: 15, healthy_fat: 12, veg: 0 },
  { key: 'sardine_egg', en: 'Sardines + eggs', zh: '沙丁鱼+鸡蛋', group: 'main', grams: null, calories: 360, protein: 46, carbs: 0, fat: 20, healthy_fat: 10, veg: 0 },
  // Vegetables
  { key: 'veg', en: 'Big veg plate', zh: '大量蔬菜 400g', group: 'veg', grams: 400, calories: 80, protein: 3, carbs: 10, fat: 1, healthy_fat: 0, veg: 5 },
  // Add protein
  { key: 'whey', en: 'Whey scoop', zh: '乳清蛋白 1勺', group: 'protein', grams: 30, calories: 120, protein: 24, carbs: 3, fat: 2, healthy_fat: 0, veg: 0 },
  { key: 'fairlife', en: 'Fairlife shake', zh: 'Fairlife 蛋白奶昔', group: 'protein', grams: null, calories: 150, protein: 30, carbs: 8, fat: 2, healthy_fat: 0, veg: 0 },
  { key: 'sardine_can', en: 'Sardines (1 can)', zh: 'Season 沙丁鱼 1罐', group: 'protein', grams: 90, calories: 190, protein: 22, carbs: 0, fat: 11, healthy_fat: 9, veg: 0 },
  { key: 'egg', en: 'Egg', zh: '鸡蛋 1颗', group: 'protein', grams: 50, calories: 75, protein: 7, carbs: 0, fat: 5, healthy_fat: 0, veg: 0 },
  // Add fat
  { key: 'olive_oil', en: 'Olive oil (1 tsp)', zh: '橄榄油 1茶匙', group: 'fat', grams: 5, calories: 45, protein: 0, carbs: 0, fat: 5, healthy_fat: 5, veg: 0 },
  { key: 'avocado', en: 'Avocado (1/2)', zh: '牛油果 1/2个', group: 'fat', grams: 70, calories: 120, protein: 1, carbs: 6, fat: 11, healthy_fat: 10, veg: 0 },
  { key: 'nuts', en: 'Nuts (12g)', zh: '坚果 12g', group: 'fat', grams: 12, calories: 90, protein: 3, carbs: 3, fat: 8, healthy_fat: 8, veg: 0 },
  // Add carbs
  { key: 'sweet_potato', en: 'Sweet potato (120g)', zh: '红薯 120g', group: 'carb', grams: 120, calories: 110, protein: 2, carbs: 26, fat: 0, healthy_fat: 0, veg: 0 },
  { key: 'brown_rice', en: 'Brown rice (cooked 100g)', zh: '糙米 100g(熟)', group: 'carb', grams: 100, calories: 110, protein: 3, carbs: 22, fat: 1, healthy_fat: 0, veg: 0 },
];
