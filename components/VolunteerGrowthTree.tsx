import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import {
  getVolunteerGrowthStage,
  type VolunteerGrowthStageId,
  type VolunteerLevelId,
} from '@/lib/volunteerLevels';

type Props = {
  levelId: VolunteerLevelId;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  bare?: boolean;
};

const FRAME = { sm: 36, md: 52, lg: 76 } as const;

type TreeColors = {
  leaf: string;
  leafDeep: string;
  leafLight: string;
  bark: string;
  barkDeep: string;
  soil: string;
};

const PALETTE: Record<
  VolunteerGrowthStageId,
  TreeColors & { sky: string; ring: string }
> = {
  seed: {
    leaf: '#8B6914',
    leafDeep: '#6B4F10',
    leafLight: '#A67C2A',
    bark: '#6B4A2E',
    barkDeep: '#4E3423',
    soil: '#C4A57A',
    sky: '#F4EFE6',
    ring: '#D2C0A6',
  },
  sapling: {
    leaf: '#6FA84F',
    leafDeep: '#4F7F38',
    leafLight: '#8FBF6A',
    bark: '#8B6B4A',
    barkDeep: '#6A5138',
    soil: '#C4A57A',
    sky: '#EEF6E8',
    ring: '#B5D09A',
  },
  small_tree: {
    leaf: '#5A9844',
    leafDeep: '#3F7230',
    leafLight: '#78B060',
    bark: '#7A5A40',
    barkDeep: '#5A4230',
    soil: '#C4A57A',
    sky: '#E8F3E6',
    ring: '#9CC48A',
  },
  young_tree: {
    leaf: '#4A8738',
    leafDeep: '#326028',
    leafLight: '#68A850',
    bark: '#6E5038',
    barkDeep: '#503A28',
    soil: '#C4A57A',
    sky: '#E4F0E3',
    ring: '#86B87C',
  },
  mature_tree: {
    leaf: '#3A7230',
    leafDeep: '#285022',
    leafLight: '#589048',
    bark: '#5E4632',
    barkDeep: '#443224',
    soil: '#C4A57A',
    sky: '#DFECDE',
    ring: '#74A86C',
  },
  mighty_tree: {
    leaf: '#2C5C28',
    leafDeep: '#1C3E1C',
    leafLight: '#487844',
    bark: '#4A3628',
    barkDeep: '#32241C',
    soil: '#C4A57A',
    sky: '#D8E8D6',
    ring: '#6A9A62',
  },
};

function Soil({ c, y = 74, w = 22 }: { c: TreeColors; y?: number; w?: number }) {
  return (
    <G>
      <Ellipse cx={32} cy={y} rx={w} ry={3.2} fill={c.soil} />
      <Ellipse cx={32} cy={y + 1.5} rx={w * 0.72} ry={1.6} fill="rgba(90,60,35,0.18)" />
    </G>
  );
}

/** Seed resting in soil with a tiny green sprout */
function SeedTree({ c }: { c: TreeColors }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 64 80">
      <Soil c={c} y={72} w={14} />
      {/* sprout */}
      <Path
        d="M32 58 C31 54 29 51 28 48 C30 50 33 52 34 48 C33 52 33 55 32 58 Z"
        fill={c.leafLight}
      />
      <Path d="M32 58 L32 64" stroke={c.bark} strokeWidth={1.4} strokeLinecap="round" />
      {/* seed body */}
      <Ellipse cx={32} cy={66} rx={7} ry={5.5} fill={c.leaf} transform="rotate(-20 32 66)" />
      <Ellipse cx={30} cy={65} rx={2.2} ry={1.6} fill="rgba(255,255,255,0.28)" transform="rotate(-20 30 65)" />
      <Path
        d="M29 62.5 C31 65 33 67 35 69"
        stroke={c.leafDeep}
        strokeWidth={0.8}
        fill="none"
        opacity={0.45}
        transform="rotate(-20 32 66)"
      />
    </Svg>
  );
}

/** Young sprout: thin stem + two true leaves */
function SaplingTree({ c }: { c: TreeColors }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 64 80">
      <Soil c={c} y={74} w={12} />
      <Path d="M32 74 L32 48" stroke={c.bark} strokeWidth={2} strokeLinecap="round" />
      {/* left leaf */}
      <Path
        d="M32 56 C24 54 18 48 20 42 C26 44 30 50 32 56 Z"
        fill={c.leaf}
      />
      <Path d="M32 56 C26 52 22 47 21 44" stroke={c.leafDeep} strokeWidth={0.7} fill="none" opacity={0.5} />
      {/* right leaf */}
      <Path
        d="M32 54 C40 52 46 46 44 40 C38 42 34 48 32 54 Z"
        fill={c.leafLight}
      />
      <Path d="M32 54 C38 50 42 45 43 42" stroke={c.leafDeep} strokeWidth={0.7} fill="none" opacity={0.45} />
      {/* top bud */}
      <Ellipse cx={32} cy={46} rx={2.4} ry={3.2} fill={c.leafDeep} />
    </Svg>
  );
}

/** Small round deciduous tree — short trunk, compact crown */
function SmallTree({ c }: { c: TreeColors }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 64 80">
      <Soil c={c} y={74} w={16} />
      {/* trunk ~28% of height */}
      <Path
        d="M30 74 L29.5 52 Q32 50 34.5 52 L34 74 Z"
        fill={c.bark}
      />
      <Path d="M31 74 L30.8 54" stroke={c.barkDeep} strokeWidth={0.8} opacity={0.35} />
      {/* crown — layered organic ellipses */}
      <Ellipse cx={32} cy={42} rx={16} ry={14} fill={c.leafDeep} />
      <Ellipse cx={24} cy={44} rx={10} ry={10} fill={c.leaf} />
      <Ellipse cx={40} cy={44} rx={10} ry={10} fill={c.leaf} />
      <Ellipse cx={32} cy={36} rx={12} ry={11} fill={c.leafLight} />
      <Ellipse cx={28} cy={38} rx={4} ry={3} fill="rgba(255,255,255,0.18)" />
    </Svg>
  );
}

/** Young tree — taller trunk, fuller irregular crown */
function YoungTree({ c }: { c: TreeColors }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 64 80">
      <Soil c={c} y={74} w={18} />
      <Path
        d="M29.5 74 L28.8 46 Q32 43 35.2 46 L34.5 74 Z"
        fill={c.bark}
      />
      <Path d="M31 74 L30.5 48" stroke={c.barkDeep} strokeWidth={1} opacity={0.3} />
      {/* lower branches peeking */}
      <Path d="M30 52 L22 48" stroke={c.bark} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M34 51 L42 47" stroke={c.bark} strokeWidth={1.8} strokeLinecap="round" />
      {/* canopy */}
      <Ellipse cx={22} cy={42} rx={9} ry={10} fill={c.leafDeep} />
      <Ellipse cx={42} cy={42} rx={9} ry={10} fill={c.leafDeep} />
      <Ellipse cx={32} cy={38} rx={15} ry={14} fill={c.leaf} />
      <Ellipse cx={26} cy={36} rx={10} ry={10} fill={c.leafLight} />
      <Ellipse cx={38} cy={37} rx={9} ry={9} fill={c.leaf} />
      <Ellipse cx={32} cy={30} rx={11} ry={9} fill={c.leafLight} />
      <Ellipse cx={27} cy={34} rx={3.5} ry={2.5} fill="rgba(255,255,255,0.16)" />
    </Svg>
  );
}

/** Mature tree — thick trunk, dense broad canopy */
function MatureTree({ c }: { c: TreeColors }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 64 80">
      <Soil c={c} y={74} w={20} />
      {/* roots */}
      <Path d="M28 74 Q22 73 18 75" stroke={c.barkDeep} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <Path d="M36 74 Q42 73 46 75" stroke={c.barkDeep} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      {/* trunk */}
      <Path
        d="M28.5 74 L27.5 42 Q32 39 36.5 42 L35.5 74 Z"
        fill={c.bark}
      />
      <Path d="M31 74 L30.2 44" stroke={c.barkDeep} strokeWidth={1.2} opacity={0.3} />
      <Path d="M29 50 L20 44" stroke={c.bark} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M35 49 L44 43" stroke={c.bark} strokeWidth={2.2} strokeLinecap="round" />
      {/* dense canopy */}
      <Ellipse cx={18} cy={40} rx={10} ry={11} fill={c.leafDeep} />
      <Ellipse cx={46} cy={40} rx={10} ry={11} fill={c.leafDeep} />
      <Ellipse cx={32} cy={36} rx={18} ry={16} fill={c.leaf} />
      <Ellipse cx={24} cy={34} rx={11} ry={12} fill={c.leafLight} />
      <Ellipse cx={40} cy={35} rx={11} ry={11} fill={c.leaf} />
      <Ellipse cx={32} cy={26} rx={13} ry={11} fill={c.leafLight} />
      <Ellipse cx={32} cy={42} rx={14} ry={9} fill={c.leafDeep} opacity={0.85} />
      <Ellipse cx={26} cy={30} rx={4} ry={3} fill="rgba(255,255,255,0.15)" />
    </Svg>
  );
}

/** Mighty tree — tallest, thickest, broadest crown + visible roots */
function MightyTree({ c }: { c: TreeColors }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 64 80">
      <Soil c={c} y={75} w={24} />
      {/* spreading roots */}
      <Path d="M26 75 Q16 73 10 76" stroke={c.barkDeep} strokeWidth={2.8} strokeLinecap="round" fill="none" />
      <Path d="M38 75 Q48 73 54 76" stroke={c.barkDeep} strokeWidth={2.8} strokeLinecap="round" fill="none" />
      <Path d="M32 75 Q32 76 28 77" stroke={c.bark} strokeWidth={2} strokeLinecap="round" fill="none" />
      {/* massive trunk */}
      <Path
        d="M26 75 L24.5 36 Q32 32 39.5 36 L38 75 Z"
        fill={c.bark}
      />
      <Path d="M30 75 L28.8 38" stroke={c.barkDeep} strokeWidth={1.6} opacity={0.35} />
      <Path d="M34 75 L35 40" stroke="rgba(255,255,255,0.08)" strokeWidth={1.2} />
      {/* strong limbs */}
      <Path d="M27 44 L12 36" stroke={c.bark} strokeWidth={3} strokeLinecap="round" />
      <Path d="M37 43 L52 35" stroke={c.bark} strokeWidth={3} strokeLinecap="round" />
      <Path d="M28 38 L16 28" stroke={c.barkDeep} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M36 37 L48 27" stroke={c.barkDeep} strokeWidth={2.2} strokeLinecap="round" />
      {/* huge layered canopy */}
      <Ellipse cx={14} cy={36} rx={11} ry={12} fill={c.leafDeep} />
      <Ellipse cx={50} cy={36} rx={11} ry={12} fill={c.leafDeep} />
      <Ellipse cx={32} cy={32} rx={22} ry={18} fill={c.leaf} />
      <Ellipse cx={20} cy={30} rx={13} ry={14} fill={c.leafDeep} />
      <Ellipse cx={44} cy={30} rx={13} ry={14} fill={c.leaf} />
      <Ellipse cx={32} cy={22} rx={15} ry={13} fill={c.leafLight} />
      <Ellipse cx={26} cy={26} rx={10} ry={10} fill={c.leafLight} />
      <Ellipse cx={38} cy={28} rx={9} ry={9} fill={c.leaf} />
      <Ellipse cx={32} cy={40} rx={16} ry={10} fill={c.leafDeep} opacity={0.9} />
      <Ellipse cx={32} cy={16} rx={9} ry={7} fill={c.leaf} />
      <Ellipse cx={24} cy={24} rx={4.5} ry={3.2} fill="rgba(255,255,255,0.14)" />
      <Circle cx={42} cy={22} r={2.2} fill="rgba(255,255,255,0.12)" />
    </Svg>
  );
}

function TreeArt({ stageId, colors }: { stageId: VolunteerGrowthStageId; colors: TreeColors }) {
  switch (stageId) {
    case 'seed':
      return <SeedTree c={colors} />;
    case 'sapling':
      return <SaplingTree c={colors} />;
    case 'small_tree':
      return <SmallTree c={colors} />;
    case 'young_tree':
      return <YoungTree c={colors} />;
    case 'mature_tree':
      return <MatureTree c={colors} />;
    case 'mighty_tree':
      return <MightyTree c={colors} />;
  }
}

export function VolunteerGrowthTree({ levelId, size = 'md', showLabel = false, bare = false }: Props) {
  const stage = getVolunteerGrowthStage(levelId);
  const palette = PALETTE[stage.id];
  const frame = FRAME[size];
  const pop = useSharedValue(0.9);

  useEffect(() => {
    pop.value = 0.9;
    pop.value = withSpring(1, { damping: 12, stiffness: 140 });
  }, [levelId, pop]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  const colors: TreeColors = {
    leaf: palette.leaf,
    leafDeep: palette.leafDeep,
    leafLight: palette.leafLight,
    bark: palette.bark,
    barkDeep: palette.barkDeep,
    soil: palette.soil,
  };

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          bare ? styles.bareFrame : styles.badge,
          {
            width: frame,
            height: frame,
            borderRadius: bare ? 10 : frame / 2,
            backgroundColor: bare ? 'transparent' : palette.sky,
            borderColor: bare ? 'transparent' : palette.ring,
          },
          animatedStyle,
        ]}>
        <View style={styles.art}>
          <TreeArt stageId={stage.id} colors={colors} />
        </View>
      </Animated.View>
      {showLabel ? <Text style={[styles.label, { color: stage.color }]}>{stage.label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
    padding: 2,
  },
  bareFrame: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  art: {
    width: '100%',
    height: '100%',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
  },
});
