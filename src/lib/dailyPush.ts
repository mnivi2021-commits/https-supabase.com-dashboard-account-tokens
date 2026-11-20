import type { Language } from '@/i18n';
import { dayOfYear } from './dates';
import type { WorkoutType } from './types';

type L = Record<Language, string>;
const l = (en: string, ta: string, hi: string): L => ({ en, ta, hi });

export interface DailyPush {
  type: WorkoutType;
  title: L;
  task: L;
  benefits: L[];
}

/** One small challenge per day, rotating through the week. */
export const PUSHES: DailyPush[] = [
  {
    type: 'pushups',
    title: l('Push-Up Challenge', 'புஷ்-அப் சவால்', 'पुश-अप चैलेंज'),
    task: l('Do 20 push-ups today', 'இன்று 20 புஷ்-அப்', 'आज 20 पुश-अप करें'),
    benefits: [
      l('Builds upper body strength', 'மேல் உடல் வலிமை', 'ऊपरी शरीर की ताकत'),
      l('Improves posture & core', 'நிலை & மைய தசைகள் மேம்படும்', 'मुद्रा और कोर बेहतर'),
      l('Boosts metabolism', 'வளர்சிதை மாற்றம் அதிகரிக்கும்', 'मेटाबॉलिज़्म बढ़ाता है'),
      l('Increases overall fitness', 'மொத்த உடல்திறன் கூடும்', 'कुल फ़िटनेस बढ़ाता है'),
    ],
  },
  {
    type: 'squats',
    title: l('Squat Challenge', 'ஸ்குவாட் சவால்', 'स्क्वाट चैलेंज'),
    task: l('Do 30 squats today', 'இன்று 30 ஸ்குவாட்', 'आज 30 स्क्वाट करें'),
    benefits: [
      l('Strong legs and hips', 'வலுவான கால் & இடுப்பு', 'मज़बूत पैर और कूल्हे'),
      l('Better balance for daily life', 'அன்றாட சமநிலை மேம்படும்', 'रोज़ के काम में बेहतर संतुलन'),
      l('Burns calories', 'கலோரி எரிக்கும்', 'कैलोरी जलाता है'),
    ],
  },
  {
    type: 'walking',
    title: l('Walking Challenge', 'நடை சவால்', 'वॉकिंग चैलेंज'),
    task: l('Walk 30 minutes today', 'இன்று 30 நிமிடம் நடங்கள்', 'आज 30 मिनट चलें'),
    benefits: [
      l('Good for the heart', 'இதயத்துக்கு நல்லது', 'दिल के लिए अच्छा'),
      l('Helps control blood sugar', 'சர்க்கரை கட்டுப்பாட்டுக்கு உதவும்', 'ब्लड शुगर नियंत्रण में मदद'),
      l('Clears the mind', 'மனம் தெளிவாகும்', 'मन तरोताज़ा'),
    ],
  },
  {
    type: 'plank',
    title: l('Plank Challenge', 'பிளாங்க் சவால்', 'प्लैंक चैलेंज'),
    task: l('Hold a plank for 2 minutes in total', 'மொத்தம் 2 நிமிடம் பிளாங்க்', 'कुल 2 मिनट प्लैंक करें'),
    benefits: [
      l('Strong core and back', 'வலுவான மையம் & முதுகு', 'मज़बूत कोर और पीठ'),
      l('Better posture', 'நல்ல உடல் நிலை', 'बेहतर मुद्रा'),
      l('Less back pain', 'முதுகுவலி குறையும்', 'कमर दर्द में कमी'),
    ],
  },
  {
    type: 'jumping_jacks',
    title: l('Jumping Jacks Challenge', 'ஜம்பிங் ஜாக்ஸ் சவால்', 'जंपिंग जैक्स चैलेंज'),
    task: l('Do 50 jumping jacks today', 'இன்று 50 ஜம்பிங் ஜாக்ஸ்', 'आज 50 जंपिंग जैक्स करें'),
    benefits: [
      l('Quick heart workout', 'விரைவான இதயப் பயிற்சி', 'तेज़ कार्डियो'),
      l('Warms up the whole body', 'முழு உடலும் சூடாகும்', 'पूरे शरीर का वार्म-अप'),
      l('Improves coordination', 'ஒருங்கிணைப்பு மேம்படும்', 'तालमेल बेहतर'),
    ],
  },
  {
    type: 'stretching',
    title: l('Stretching Challenge', 'ஸ்ட்ரெச்சிங் சவால்', 'स्ट्रेचिंग चैलेंज'),
    task: l('Stretch for 10 minutes today', 'இன்று 10 நிமிடம் ஸ்ட்ரெச்சிங்', 'आज 10 मिनट स्ट्रेच करें'),
    benefits: [
      l('More flexible joints', 'மூட்டுகள் நெகிழும்', 'जोड़ों में लचीलापन'),
      l('Less stiffness and pain', 'இறுக்கம் & வலி குறையும்', 'अकड़न और दर्द कम'),
      l('Calms the body', 'உடல் அமைதியாகும்', 'शरीर को आराम'),
    ],
  },
  {
    type: 'situps',
    title: l('Sit-Up Challenge', 'சிட்-அப் சவால்', 'सिट-अप चैलेंज'),
    task: l('Do 20 sit-ups today', 'இன்று 20 சிட்-அப்', 'आज 20 सिट-अप करें'),
    benefits: [
      l('Stronger tummy muscles', 'வயிற்றுத் தசை வலுவாகும்', 'पेट की मांसपेशियां मज़बूत'),
      l('Supports your back', 'முதுகுக்கு ஆதரவு', 'पीठ को सहारा'),
      l('Better posture', 'நல்ல உடல் நிலை', 'बेहतर मुद्रा'),
    ],
  },
];

export const QUOTES: L[] = [
  l('A healthy lifestyle is not a destination, it’s a daily choice.', 'ஆரோக்கிய வாழ்க்கை ஒரு இலக்கு அல்ல, அது தினசரி தேர்வு.', 'स्वस्थ जीवन मंज़िल नहीं, रोज़ का चुनाव है।'),
  l('Small daily efforts create big health results.', 'சிறிய தினசரி முயற்சிகள் பெரிய ஆரோக்கிய பலன் தரும்.', 'रोज़ की छोटी कोशिशें बड़े नतीजे देती हैं।'),
  l('Take care of your body. It’s the only place you have to live.', 'உடலைக் கவனியுங்கள்; அதுதான் நீங்கள் வாழும் ஒரே இடம்.', 'शरीर का ख्याल रखें, यही आपका असली घर है।'),
  l('Every step counts — just keep moving.', 'ஒவ்வொரு அடியும் முக்கியம் — நகர்ந்துகொண்டே இருங்கள்.', 'हर कदम मायने रखता है — चलते रहें।'),
  l('You don’t have to be great to start, but you have to start to be great.', 'தொடங்க சிறந்தவராக இருக்க வேண்டியதில்லை; சிறந்தவராக தொடங்க வேண்டும்.', 'शुरू करने के लिए महान होना ज़रूरी नहीं, महान बनने के लिए शुरू करना ज़रूरी है।'),
  l('Health is the greatest wealth.', 'ஆரோக்கியமே மிகப் பெரிய செல்வம்.', 'स्वास्थ्य ही सबसे बड़ा धन है।'),
  l('Do it for the people who love you.', 'உங்களை நேசிப்பவர்களுக்காகச் செய்யுங்கள்.', 'उनके लिए करें जो आपसे प्यार करते हैं।'),
];

export function todaysPush(d = new Date()): DailyPush {
  return PUSHES[dayOfYear(d) % PUSHES.length];
}

export function todaysQuote(d = new Date()): L {
  return QUOTES[dayOfYear(d) % QUOTES.length];
}
