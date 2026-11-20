export const palettes = {
  light: {
    bg: '#F1F8F5',
    card: '#FFFFFF',
    cardAlt: '#E8F4EE',
    text: '#0F241B',
    muted: '#56695F',
    border: '#D6E6DE',
    primary: '#16A34A',
    primaryText: '#FFFFFF',
    primarySoft: '#DCFCE7',
    secondary: '#0284C7',
    secondarySoft: '#E0F2FE',
    danger: '#DC2626',
    warning: '#F59E0B',
    tabBar: '#FFFFFF',
    inputBg: '#F7FBF9',
  },
  dark: {
    bg: '#0A1511',
    card: '#13211B',
    cardAlt: '#1A2C24',
    text: '#E7F3ED',
    muted: '#9BB2A7',
    border: '#253A31',
    primary: '#22C55E',
    primaryText: '#04130B',
    primarySoft: '#14351F',
    secondary: '#38BDF8',
    secondarySoft: '#0C2A3A',
    danger: '#F87171',
    warning: '#FBBF24',
    tabBar: '#0F1B16',
    inputBg: '#0F1B16',
  },
};

export type Colors = typeof palettes.light;

/** Large, elder-friendly type scale. */
export const font = {
  small: 14,
  body: 17,
  large: 20,
  title: 24,
  hero: 34,
};
