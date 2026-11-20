import type { Language } from '@/i18n';
import type { BmiCategory } from './health';

/** Text in all three app languages. */
type L = Record<Language, string>;
const l = (en: string, ta: string, hi: string): L => ({ en, ta, hi });

export type DietPref = 'veg' | 'egg' | 'nonveg';

/** Protein target range: 0.8 – 1.2 g per kg body weight per day. */
export function proteinRange(weightKg: number): [number, number] {
  return [Math.round(weightKg * 0.8), Math.round(weightKg * 1.2)];
}

// ---------- BMI category → dietary focus (user's table; Asian/Indian cut-offs) ----------

export interface DietFocusRow {
  cats: BmiCategory[];
  label: L;
  range: string;
  focus: L;
  portion: L;
  color: string;
  icon: string;
}

export const DIET_FOCUS: DietFocusRow[] = [
  {
    cats: ['under'],
    label: l('Underweight', 'எடை குறைவு', 'कम वज़न'),
    range: '< 18.5',
    focus: l('Calorie & nutrient surplus', 'கூடுதல் கலோரி & சத்து', 'कैलोरी और पोषण अधिक'),
    portion: l(
      'Add healthy fats (ghee, nuts, coconut) and increase complex carbs.',
      'ஆரோக்கிய கொழுப்பு (நெய், கொட்டைகள், தேங்காய்) சேர்த்து, முழு தானியங்களைக் கூட்டவும்.',
      'स्वस्थ वसा (घी, मेवे, नारियल) जोड़ें और साबुत अनाज बढ़ाएं।',
    ),
    color: '#3B82F6',
    icon: 'human-male',
  },
  {
    cats: ['normal'],
    label: l('Normal', 'சாதாரணம்', 'सामान्य'),
    range: '18.5 – 22.9',
    focus: l('Maintenance & balance', 'பராமரிப்பு & சமநிலை', 'संतुलन बनाए रखें'),
    portion: l(
      'Follow the standard plate method (50% veggies, 25% protein, 25% carbs).',
      'சமச்சீர் தட்டு முறை (50% காய்கறி, 25% புரதம், 25% மாவுச்சத்து).',
      'मानक थाली तरीका अपनाएं (50% सब्ज़ी, 25% प्रोटीन, 25% कार्ब्स)।',
    ),
    color: '#22C55E',
    icon: 'human-male',
  },
  {
    cats: ['over', 'obese'],
    label: l('Overweight / Obese', 'அதிக எடை / பருமன்', 'अधिक वज़न / मोटापा'),
    range: '≥ 23',
    focus: l('Moderate calorie deficit', 'மிதமான கலோரி குறைப்பு', 'मध्यम कैलोरी कमी'),
    portion: l(
      'Prioritize high fiber and lean protein; reduce refined rice and oil.',
      'நார்ச்சத்து & புரதம் அதிகம்; வெள்ளை அரிசி & எண்ணெய் குறைவு.',
      'फाइबर और लीन प्रोटीन बढ़ाएं; सफ़ेद चावल और तेल कम करें।',
    ),
    color: '#F97316',
    icon: 'human-male',
  },
];

/** One extra portion hint per BMI category, shown above the meal plan. */
export const PORTION_HINT: Record<'under' | 'normal' | 'high', L> = {
  under: l(
    'Take about 1¼ portions of each meal and add 1 tsp ghee or a handful of nuts.',
    'ஒவ்வொரு உணவிலும் சுமார் 1¼ பங்கு; 1 தேக்கரண்டி நெய் அல்லது ஒரு கைப்பிடி கொட்டைகள் சேர்க்கவும்.',
    'हर भोजन लगभग 1¼ हिस्सा लें; 1 चम्मच घी या मुट्ठी भर मेवे जोड़ें।',
  ),
  normal: l('Eat the portions as listed.', 'பட்டியலில் உள்ள அளவில் சாப்பிடுங்கள்.', 'सूची के अनुसार मात्रा लें।'),
  high: l(
    'Fill half the plate with vegetables, keep rice to ½–¾ cup and use less oil.',
    'தட்டில் பாதி காய்கறி; அரிசி ½–¾ கப்; எண்ணெய் குறைவு.',
    'आधी थाली सब्ज़ी; चावल ½–¾ कप; तेल कम।',
  ),
};

// ---------- Daily meal plan (South-Indian style, from the design) ----------

export interface Meal {
  id: string;
  icon: string;
  name: L;
  time: string;
  /** Menu lines; a line can depend on the diet preference. */
  menu: (pref: DietPref) => L[];
  protein: string; // grams
  vitamins: L[];
}

export const MEAL_PLAN: Meal[] = [
  {
    id: 'breakfast',
    icon: 'weather-sunset-up',
    name: l('Tiffin / Breakfast', 'டிபன் / காலை உணவு', 'नाश्ता'),
    time: '8:00 – 9:00 AM',
    menu: (pref) => [
      l('2–3 idlis or 2 dosas (ragi / oats / millet)', '2–3 இட்லி அல்லது 2 தோசை (ராகி / ஓட்ஸ் / சிறுதானியம்)', '2–3 इडली या 2 डोसा (रागी / ओट्स / मिलेट)'),
      l('1 bowl sambar', '1 கிண்ணம் சாம்பார்', '1 कटोरी सांभर'),
      l('2 tbsp chutney', '2 தேக்கரண்டி சட்னி', '2 चम्मच चटनी'),
      pref === 'veg'
        ? l('1 handful roasted chana', '1 கைப்பிடி வறுத்த கடலை', '1 मुट्ठी भुना चना')
        : l('1 boiled egg / roasted chana', '1 அவித்த முட்டை / வறுத்த கடலை', '1 उबला अंडा / भुना चना'),
    ],
    protein: '14 – 18 g',
    vitamins: [
      l('B-complex: fermented batter', 'B-காம்ப்ளெக்ஸ்: புளித்த மாவு', 'B-कॉम्प्लेक्स: खमीर वाला घोल'),
      l('Vitamin A & C: carrots & drumsticks', 'வைட்டமின் A & C: கேரட் & முருங்கை', 'विटामिन A और C: गाजर और सहजन'),
      l('Iron & calcium: ragi / millet & lentils', 'இரும்பு & கால்சியம்: ராகி / சிறுதானியம் & பருப்பு', 'आयरन और कैल्शियम: रागी / मिलेट और दाल'),
    ],
  },
  {
    id: 'midmorning',
    icon: 'food-apple',
    name: l('Mid-morning', 'காலை இடைவேளை', 'सुबह का स्नैक'),
    time: '11:00 AM',
    menu: () => [
      l('1 seasonal fruit (guava / papaya / banana)', '1 பருவப் பழம் (கொய்யா / பப்பாளி / வாழை)', '1 मौसमी फल (अमरूद / पपीता / केला)'),
      l('1 glass buttermilk (neer mor)', '1 கிளாஸ் மோர் (நீர் மோர்)', '1 गिलास छाछ'),
    ],
    protein: '3 – 4 g',
    vitamins: [
      l('Vitamin C: guava / papaya', 'வைட்டமின் C: கொய்யா / பப்பாளி', 'विटामिन C: अमरूद / पपीता'),
      l('Probiotics & calcium: buttermilk aids gut health', 'புரோபயாடிக் & கால்சியம்: மோர் குடலுக்கு நல்லது', 'प्रोबायोटिक और कैल्शियम: छाछ पेट के लिए अच्छी'),
    ],
  },
  {
    id: 'lunch',
    icon: 'white-balance-sunny',
    name: l('Lunch', 'மதிய உணவு', 'दोपहर का खाना'),
    time: '1:00 – 2:00 PM',
    menu: (pref) => [
      l('1 cup rice (brown / parboiled) or 2 phulkas', '1 கப் சாதம் (பழுப்பு / புழுங்கல்) அல்லது 2 புல்கா', '1 कप चावल (ब्राउन / उसना) या 2 फुल्का'),
      l('1 cup dal / keerai kootu', '1 கப் பருப்பு / கீரை கூட்டு', '1 कप दाल / पालक कूटू'),
      l('1 cup poriyal (beans / cabbage)', '1 கப் பொரியல் (பீன்ஸ் / முட்டைகோஸ்)', '1 कप सब्ज़ी (बीन्स / पत्ता गोभी)'),
      pref === 'nonveg'
        ? l('100 g chicken / fish', '100 கி சிக்கன் / மீன்', '100 ग्रा चिकन / मछली')
        : pref === 'egg'
          ? l('2 boiled eggs or 100 g paneer', '2 அவித்த முட்டை அல்லது 100 கி பனீர்', '2 उबले अंडे या 100 ग्रा पनीर')
          : l('100 g paneer / soya chunks', '100 கி பனீர் / சோயா', '100 ग्रा पनीर / सोया'),
      l('1 small bowl curd', '1 சிறிய கிண்ணம் தயிர்', '1 छोटी कटोरी दही'),
    ],
    protein: '25 – 32 g',
    vitamins: [
      l('Iron & folate: spinach (keerai)', 'இரும்பு & ஃபோலேட்: கீரை', 'आयरन और फ़ोलेट: पालक'),
      l('Vitamin B12 & D: curd, paneer, fish', 'வைட்டமின் B12 & D: தயிர், பனீர், மீன்', 'विटामिन B12 और D: दही, पनीर, मछली'),
      l('Potassium & fiber: mixed veggies', 'பொட்டாசியம் & நார்ச்சத்து: கலவைக் காய்கறி', 'पोटैशियम और फाइबर: मिली-जुली सब्ज़ियां'),
    ],
  },
  {
    id: 'snack',
    icon: 'coffee',
    name: l('Evening snack', 'மாலை சிற்றுண்டி', 'शाम का नाश्ता'),
    time: '5:00 PM',
    menu: () => [
      l('1 cup green tea / filter coffee (low sugar)', '1 கப் கிரீன் டீ / ஃபில்டர் காபி (குறைந்த சர்க்கரை)', '1 कप ग्रीन टी / फ़िल्टर कॉफ़ी (कम चीनी)'),
      l('1 small bowl boiled sundal (chickpeas / green gram)', '1 சிறிய கிண்ணம் சுண்டல் (கொண்டைக்கடலை / பாசிப்பயறு)', '1 छोटी कटोरी उबला चना / मूंग'),
    ],
    protein: '7 – 9 g',
    vitamins: [
      l('Magnesium & zinc: chickpeas', 'மெக்னீசியம் & துத்தநாகம்: கொண்டைக்கடலை', 'मैग्नीशियम और ज़िंक: चना'),
      l('Antioxidants: tea / coffee', 'ஆன்டிஆக்ஸிடன்ட்: டீ / காபி', 'एंटीऑक्सीडेंट: चाय / कॉफ़ी'),
    ],
  },
  {
    id: 'dinner',
    icon: 'weather-night',
    name: l('Dinner', 'இரவு உணவு', 'रात का खाना'),
    time: '7:30 – 8:30 PM',
    menu: (pref) => [
      l('2 chapatis or 2 adai (mixed lentil dosa)', '2 சப்பாத்தி அல்லது 2 அடை (கலவைப் பருப்பு தோசை)', '2 चपाती या 2 अड़ई (मिली दाल का डोसा)'),
      pref === 'nonveg'
        ? l('1 bowl vegetable kurma / dal or egg curry', '1 கிண்ணம் காய்கறி குருமா / பருப்பு அல்லது முட்டைக் குழம்பு', '1 कटोरी सब्ज़ी कुरमा / दाल या अंडा करी')
        : l('1 bowl vegetable kurma / dal', '1 கிண்ணம் காய்கறி குருமா / பருப்பு', '1 कटोरी सब्ज़ी कुरमा / दाल'),
      l('Cucumber & tomato salad', 'வெள்ளரி & தக்காளி சாலட்', 'खीरा और टमाटर सलाद'),
    ],
    protein: '15 – 20 g',
    vitamins: [
      l('Vitamin E & K: cucumber, tomato', 'வைட்டமின் E & K: வெள்ளரி, தக்காளி', 'विटामिन E और K: खीरा, टमाटर'),
      l('B-vitamins: mixed lentils in adai', 'B-வைட்டமின்கள்: அடையில் கலவைப் பருப்பு', 'B-विटामिन: अड़ई में मिली दालें'),
    ],
  },
];

// ---------- Quick tips for better absorption ----------

export const ABSORPTION_TIPS: L[] = [
  l(
    'Eat a vitamin C food (lemon, guava, tomato) with iron foods like spinach, ragi and dal.',
    'கீரை, ராகி, பருப்பு போன்ற இரும்புச்சத்து உணவுடன் வைட்டமின் C (எலுமிச்சை, கொய்யா, தக்காளி) சேர்க்கவும்.',
    'पालक, रागी, दाल जैसे आयरन वाले खाने के साथ विटामिन C (नींबू, अमरूद, टमाटर) लें।',
  ),
  l(
    'Keep tea and coffee 1 hour away from main meals — they block iron absorption.',
    'முக்கிய உணவுக்கு 1 மணி நேரம் முன்/பின் டீ, காபி தவிர்க்கவும் — இரும்புச்சத்தை உறிஞ்சுவதைத் தடுக்கும்.',
    'मुख्य भोजन से 1 घंटा पहले/बाद चाय-कॉफ़ी न लें — ये आयरन सोखने में रुकावट करती हैं।',
  ),
  l(
    'Soak, sprout or ferment pulses and grains (idli, dosa, sundal) for easier digestion.',
    'பருப்பு, தானியங்களை ஊறவைத்து, முளைக்கட்டி அல்லது புளிக்க வைத்து (இட்லி, தோசை, சுண்டல்) சாப்பிடுங்கள்.',
    'दाल और अनाज को भिगोकर, अंकुरित या खमीर करके (इडली, डोसा) खाएं — पचने में आसान।',
  ),
  l(
    'Add a little healthy fat (ghee, oil, nuts) to vegetables to absorb vitamins A, D, E and K.',
    'வைட்டமின் A, D, E, K உறிஞ்ச காய்கறியுடன் சிறிது நெய் / எண்ணெய் / கொட்டைகள் சேர்க்கவும்.',
    'विटामिन A, D, E, K के लिए सब्ज़ी के साथ थोड़ा घी / तेल / मेवे लें।',
  ),
  l(
    'Get 15–20 minutes of morning sunlight for vitamin D.',
    'வைட்டமின் D க்கு காலையில் 15–20 நிமிடம் சூரிய ஒளி.',
    'विटामिन D के लिए सुबह 15–20 मिनट धूप लें।',
  ),
  l(
    'Take calcium (milk, curd) and iron foods at different meals.',
    'கால்சியம் (பால், தயிர்) மற்றும் இரும்புச்சத்து உணவுகளை வெவ்வேறு வேளைகளில் சாப்பிடுங்கள்.',
    'कैल्शियम (दूध, दही) और आयरन वाला खाना अलग-अलग समय पर लें।',
  ),
  l(
    'Eat slowly, chew well and drink water between meals rather than with them.',
    'மெதுவாக நன்றாக மென்று சாப்பிடுங்கள்; உணவுடன் அல்ல, இடையில் தண்ணீர் குடியுங்கள்.',
    'धीरे-धीरे चबाकर खाएं; पानी खाने के बीच में पिएं, साथ में नहीं।',
  ),
];
