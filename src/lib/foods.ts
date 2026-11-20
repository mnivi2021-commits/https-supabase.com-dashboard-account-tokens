import type { Language } from '@/i18n';
import type { Meal } from './types';

/**
 * Common Indian foods with APPROXIMATE nutrition per serving (home-style cooking).
 * Values are rounded estimates from standard food-composition tables; real dishes vary
 * with recipe and oil, so the app labels them as estimates.
 */
export interface FoodItem {
  id: string;
  name: Record<Language, string>;
  /** Serving description, e.g. "1 piece", "1 cup (150 g)". */
  serving: string;
  kcal: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  category: 'tiffin' | 'meal' | 'curry' | 'drink' | 'fruit' | 'snack' | 'protein';
}

const f = (
  id: string,
  en: string,
  ta: string,
  hi: string,
  serving: string,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  category: FoodItem['category'],
): FoodItem => ({ id, name: { en, ta, hi }, serving, kcal, protein, carbs, fat, category });

export const FOODS: FoodItem[] = [
  // Tiffin / breakfast
  f('idli', 'Idli', 'இட்லி', 'इडली', '1 piece', 58, 2, 12, 0.2, 'tiffin'),
  f('dosa', 'Plain dosa', 'தோசை', 'सादा डोसा', '1 dosa', 133, 3, 22, 4, 'tiffin'),
  f('masala_dosa', 'Masala dosa', 'மசாலா தோசை', 'मसाला डोसा', '1 dosa', 250, 5, 35, 10, 'tiffin'),
  f('upma', 'Upma', 'உப்புமா', 'उपमा', '1 cup', 250, 6, 35, 9, 'tiffin'),
  f('pongal', 'Ven pongal', 'வெண் பொங்கல்', 'पोंगल', '1 cup', 300, 8, 40, 12, 'tiffin'),
  f('poha', 'Poha', 'அவல் உப்புமா', 'पोहा', '1 cup', 250, 5, 40, 8, 'tiffin'),
  f('vada', 'Medu vada', 'மெது வடை', 'मेदु वड़ा', '1 piece', 130, 4, 13, 7, 'tiffin'),
  f('poori', 'Poori', 'பூரி', 'पूरी', '1 piece', 100, 2, 12, 5, 'tiffin'),
  f('oats', 'Oats with milk', 'ஓட்ஸ் (பாலுடன்)', 'दूध वाला ओट्स', '1 bowl', 210, 9, 30, 6, 'tiffin'),
  f('bread', 'Bread slice', 'பிரெட்', 'ब्रेड स्लाइस', '1 slice', 70, 2.5, 13, 1, 'tiffin'),
  // Meals
  f('rice', 'Cooked rice', 'சாதம்', 'चावल', '1 cup (150 g)', 195, 4, 43, 0.4, 'meal'),
  f('brown_rice', 'Brown rice', 'பழுப்பு அரிசி சாதம்', 'ब्राउन राइस', '1 cup (150 g)', 215, 5, 45, 1.8, 'meal'),
  f('chapati', 'Chapati / roti', 'சப்பாத்தி', 'चपाती / रोटी', '1 piece', 110, 3, 18, 3, 'meal'),
  f('paratha', 'Paratha', 'பரோட்டா', 'पराठा', '1 piece', 200, 4, 28, 8, 'meal'),
  f('curd_rice', 'Curd rice', 'தயிர் சாதம்', 'दही चावल', '1 cup', 230, 6, 35, 7, 'meal'),
  f('lemon_rice', 'Lemon rice', 'எலுமிச்சை சாதம்', 'नींबू चावल', '1 cup', 250, 4, 42, 8, 'meal'),
  f('biryani', 'Chicken biryani', 'சிக்கன் பிரியாணி', 'चिकन बिरयानी', '1 plate', 500, 22, 60, 18, 'meal'),
  f('ragi_ball', 'Ragi ball (kali)', 'ராகி களி', 'रागी मुद्दे', '1 ball', 200, 4, 43, 1.5, 'meal'),
  // Curries & sides
  f('sambar', 'Sambar', 'சாம்பார்', 'सांभर', '1 cup', 130, 6, 18, 4, 'curry'),
  f('rasam', 'Rasam', 'ரசம்', 'रसम', '1 cup', 60, 2, 8, 2, 'curry'),
  f('dal', 'Dal', 'பருப்பு', 'दाल', '1 cup', 180, 12, 28, 3, 'curry'),
  f('sabzi', 'Vegetable poriyal / sabzi', 'காய்கறி பொரியல்', 'सब्ज़ी', '1 cup', 120, 3, 12, 7, 'curry'),
  f('paneer_curry', 'Paneer curry', 'பனீர் குழம்பு', 'पनीर सब्ज़ी', '1 cup', 350, 15, 10, 28, 'curry'),
  f('chicken_curry', 'Chicken curry', 'சிக்கன் குழம்பு', 'चिकन करी', '1 cup', 300, 25, 8, 18, 'curry'),
  f('fish_curry', 'Fish curry', 'மீன் குழம்பு', 'मछली करी', '1 cup', 220, 22, 6, 12, 'curry'),
  f('curd', 'Curd', 'தயிர்', 'दही', '1 cup (200 g)', 120, 7, 9, 6, 'curry'),
  // Protein
  f('egg', 'Boiled egg', 'அவித்த முட்டை', 'उबला अंडा', '1 egg', 78, 6, 0.6, 5, 'protein'),
  f('omelette', 'Omelette (2 eggs)', 'ஆம்லெட் (2 முட்டை)', 'ऑमलेट (2 अंडे)', '1 omelette', 190, 13, 1, 15, 'protein'),
  f('sprouts', 'Sprouts salad', 'முளைகட்டிய பயறு', 'अंकुरित सलाद', '1 cup', 100, 7, 15, 1, 'protein'),
  f('paneer', 'Paneer', 'பனீர்', 'पनीर', '50 g', 145, 9, 2, 11, 'protein'),
  // Drinks
  f('milk', 'Milk', 'பால்', 'दूध', '1 glass (200 ml)', 120, 6, 10, 6, 'drink'),
  f('tea', 'Tea with milk & sugar', 'டீ (பால், சர்க்கரை)', 'चाय (दूध, चीनी)', '1 cup', 90, 2, 14, 2.5, 'drink'),
  f('coffee', 'Coffee with milk & sugar', 'காபி (பால், சர்க்கரை)', 'कॉफ़ी (दूध, चीनी)', '1 cup', 90, 2, 14, 2.5, 'drink'),
  f('buttermilk', 'Buttermilk', 'மோர்', 'छाछ', '1 glass', 40, 2, 4, 1.5, 'drink'),
  f('soft_drink', 'Soft drink', 'குளிர்பானம்', 'कोल्ड ड्रिंक', '300 ml', 130, 0, 33, 0, 'drink'),
  // Fruits
  f('banana', 'Banana', 'வாழைப்பழம்', 'केला', '1 medium', 105, 1.3, 27, 0.4, 'fruit'),
  f('apple', 'Apple', 'ஆப்பிள்', 'सेब', '1 medium', 95, 0.5, 25, 0.3, 'fruit'),
  f('orange', 'Orange', 'ஆரஞ்சு', 'संतरा', '1 medium', 62, 1.2, 15, 0.2, 'fruit'),
  f('papaya', 'Papaya', 'பப்பாளி', 'पपीता', '1 cup', 62, 0.7, 16, 0.4, 'fruit'),
  f('guava', 'Guava', 'கொய்யா', 'अमरूद', '1 medium', 37, 1.4, 8, 0.5, 'fruit'),
  // Snacks
  f('almonds', 'Almonds', 'பாதாம்', 'बादाम', '10 pieces', 70, 2.6, 2.5, 6, 'snack'),
  f('peanuts', 'Roasted peanuts', 'வறுத்த கடலை', 'भुनी मूंगफली', '30 g', 170, 7, 5, 14, 'snack'),
  f('biscuits', 'Biscuits', 'பிஸ்கட்', 'बिस्कुट', '2 pieces', 60, 1, 10, 2, 'snack'),
  f('samosa', 'Samosa', 'சமோசா', 'समोसा', '1 piece', 260, 4, 30, 14, 'snack'),
  f('gulab_jamun', 'Gulab jamun', 'குலாப் ஜாமூன்', 'गुलाब जामुन', '1 piece', 150, 2, 25, 6, 'snack'),
];

export const MEALS: Meal[] = ['breakfast', 'lunch', 'snack', 'dinner'];

export const MEAL_ICONS: Record<Meal, string> = {
  breakfast: 'weather-sunset-up',
  lunch: 'white-balance-sunny',
  snack: 'coffee',
  dinner: 'weather-night',
};

/** Meal that fits the current time of day. */
export function mealForNow(d = new Date()): Meal {
  const h = d.getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 19) return 'snack';
  return 'dinner';
}

/**
 * Daily macro goals for a calorie target:
 * protein ≈ 1 g per kg body weight, fat ≈ 25 % of calories, carbs = the rest.
 */
export function macroTargets(kcal: number, weightKg: number) {
  const protein = Math.round(weightKg * 1.0);
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat };
}

export const MACRO_COLORS = { protein: '#DC2626', carbs: '#F59E0B', fat: '#9333EA' };
