import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import type { TKey } from '@/i18n';
import { useSettings } from '@/theme/settings';
import { Card, Icon, Row, Txt } from './ui';

type Kind = 'height' | 'weight' | 'photo';

const W = 260;
const H = 200;

/** Simple standing person, feet at (x, footY), about `h` px tall. */
function Person({ x, footY, h, color }: { x: number; footY: number; h: number; color: string }) {
  const head = h * 0.11;
  const top = footY - h;
  const neck = top + head * 2;
  const hip = top + h * 0.52;
  const shoulder = neck + h * 0.04;
  return (
    <G>
      <Circle cx={x} cy={top + head} r={head} fill={color} />
      <Path
        d={`M ${x - h * 0.11} ${shoulder} Q ${x} ${neck - 2} ${x + h * 0.11} ${shoulder} L ${x + h * 0.09} ${hip} L ${x - h * 0.09} ${hip} Z`}
        fill={color}
      />
      <Line x1={x - h * 0.11} y1={shoulder + 2} x2={x - h * 0.14} y2={hip + 4} stroke={color} strokeWidth={h * 0.045} strokeLinecap="round" />
      <Line x1={x + h * 0.11} y1={shoulder + 2} x2={x + h * 0.14} y2={hip + 4} stroke={color} strokeWidth={h * 0.045} strokeLinecap="round" />
      <Line x1={x - h * 0.045} y1={hip} x2={x - h * 0.05} y2={footY} stroke={color} strokeWidth={h * 0.06} strokeLinecap="round" />
      <Line x1={x + h * 0.045} y1={hip} x2={x + h * 0.05} y2={footY} stroke={color} strokeWidth={h * 0.06} strokeLinecap="round" />
    </G>
  );
}

function useLoop(duration: number, pause = 900, native = true) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
        Animated.delay(pause),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: native }),
        Animated.delay(300),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [v, duration, pause, native]);
  return v;
}

/** Height: a marker rises along the wall from the floor to the top of the head. */
function HeightAnim() {
  const { colors: c } = useSettings();
  const floor = 180;
  const personH = 140;
  const headTop = floor - personH;
  const v = useLoop(1800);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -(personH)] });
  const labelOpacity = v.interpolate({ inputRange: [0, 0.85, 1], outputRange: [0, 0, 1] });
  return (
    <View style={{ width: W, height: H }}>
      <Svg width={W} height={H}>
        {/* wall + floor */}
        <Rect x={30} y={10} width={12} height={floor - 10} fill={c.border} />
        <Line x1={20} y1={floor} x2={W - 10} y2={floor} stroke={c.muted} strokeWidth={3} />
        {/* tape on the wall */}
        {Array.from({ length: 15 }, (_, i) => (
          <Line key={i} x1={42} y1={floor - i * 10} x2={i % 5 === 0 ? 56 : 50} y2={floor - i * 10} stroke={c.muted} strokeWidth={1.5} />
        ))}
        <Person x={80} footY={floor} h={personH} color={c.secondary} />
        {/* flat book on the head */}
        <Rect x={40} y={headTop - 6} width={70} height={6} rx={2} fill="#F59E0B" />
      </Svg>
      <Animated.View
        style={{
          position: 'absolute',
          left: 30,
          top: floor - 2,
          width: 90,
          height: 4,
          borderRadius: 2,
          backgroundColor: c.primary,
          transform: [{ translateY }],
        }}
      />
      <Animated.View style={{ position: 'absolute', left: 130, top: headTop - 14, opacity: labelOpacity }}>
        <Txt bold size="large" color={c.primary}>
          ↕ 165 cm
        </Txt>
      </Animated.View>
    </View>
  );
}

/** Weight: person steps on a scale and the display counts up. */
function WeightAnim() {
  const { colors: c } = useSettings();
  const v = useLoop(1600, 1200, false);
  const [shown, setShown] = useState('0.0');
  useEffect(() => {
    const id = v.addListener(({ value }) => setShown((value * 65).toFixed(1)));
    return () => v.removeListener(id);
  }, [v]);
  const drop = v.interpolate({ inputRange: [0, 0.25, 1], outputRange: [-14, 0, 0] });
  return (
    <View style={{ width: W, height: H }}>
      <Svg width={W} height={H}>
        <Line x1={10} y1={188} x2={W - 10} y2={188} stroke={c.muted} strokeWidth={3} />
        {/* scale */}
        <Rect x={70} y={160} width={120} height={26} rx={10} fill={c.cardAlt} stroke={c.muted} strokeWidth={2} />
        <Rect x={110} y={166} width={40} height={14} rx={3} fill="#0F241B" />
      </Svg>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, transform: [{ translateY: drop }] }}>
        <Svg width={W} height={H}>
          <Person x={130} footY={160} h={130} color={c.secondary} />
        </Svg>
      </Animated.View>
      <View style={{ position: 'absolute', left: 110, top: 166, width: 40, height: 14, alignItems: 'center', justifyContent: 'center' }}>
        <Txt bold size="small" color="#22C55E" style={{ fontSize: 10, lineHeight: 12 }}>
          {shown}
        </Txt>
      </View>
      <View style={{ position: 'absolute', right: 6, top: 30 }}>
        <Txt bold size="large" color={c.primary}>
          {shown} kg
        </Txt>
      </View>
    </View>
  );
}

/** Photo: phone frame with a full-body figure; the framing corners pulse and a flash fires. */
function PhotoAnim() {
  const { colors: c } = useSettings();
  const v = useLoop(1400, 600);
  const scale = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1.08, 0.97, 1] });
  const flash = v.interpolate({ inputRange: [0, 0.85, 0.92, 1], outputRange: [0, 0, 0.8, 0] });
  const corner = (d: string) => <Path d={d} stroke={c.primary} strokeWidth={4} fill="none" strokeLinecap="round" />;
  return (
    <View style={{ width: W, height: H, alignItems: 'center' }}>
      <Svg width={W} height={H}>
        {/* phone */}
        <Rect x={75} y={4} width={110} height={192} rx={16} fill={c.text} />
        <Rect x={81} y={14} width={98} height={172} rx={8} fill={c.cardAlt} />
        <Person x={130} footY={172} h={140} color={c.secondary} />
        <SvgText x={130} y={194} fontSize={9} fill={c.bg} textAnchor="middle">
          ● REC
        </SvgText>
      </Svg>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, transform: [{ scale }] }}>
        <Svg width={W} height={H}>
          {corner('M 90 34 L 90 22 L 102 22')}
          {corner('M 158 22 L 170 22 L 170 34')}
          {corner('M 90 166 L 90 178 L 102 178')}
          {corner('M 158 178 L 170 178 L 170 166')}
        </Svg>
      </Animated.View>
      <Animated.View
        style={{ position: 'absolute', left: 81, top: 14, width: 98, height: 172, borderRadius: 8, backgroundColor: '#FFFFFF', opacity: flash }}
      />
    </View>
  );
}

const TIPS: Record<Kind, { title: TKey; tips: TKey }> = {
  height: { title: 'guide_height_title', tips: 'guide_height_tips' },
  weight: { title: 'guide_weight_title', tips: 'guide_weight_tips' },
  photo: { title: 'guide_photo_title', tips: 'guide_photo_tips' },
};

/** Animated "how to measure" example shown in onboarding and profile editing. */
export function MeasureGuide({ kind }: { kind: Kind }) {
  const { t, colors: c } = useSettings();
  return (
    <Card style={{ backgroundColor: c.secondarySoft, borderColor: c.secondary }}>
      <Row gap={8} style={{ marginBottom: 6 }}>
        <Icon name="lightbulb-on-outline" color={c.secondary} />
        <Txt bold>{t(TIPS[kind].title)}</Txt>
      </Row>
      <View style={{ alignItems: 'center' }} accessible accessibilityLabel={t(TIPS[kind].title)}>
        {kind === 'height' ? <HeightAnim /> : kind === 'weight' ? <WeightAnim /> : <PhotoAnim />}
      </View>
      {t(TIPS[kind].tips)
        .split('\n')
        .map((line, i) => (
          <Row key={line} gap={8} style={{ marginTop: 6, alignItems: 'flex-start' }}>
            <Txt bold color={c.secondary}>
              {i + 1}.
            </Txt>
            <View style={{ flex: 1 }}>
              <Txt>{line}</Txt>
            </View>
          </Row>
        ))}
    </Card>
  );
}
