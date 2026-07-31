import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'coral';

/** Distinct silhouette per achievement type */
export type BadgeShape =
  | 'flag'
  | 'spark'
  | 'hands'
  | 'trophy'
  | 'calendar'
  | 'clipboard'
  | 'leaf'
  | 'star'
  | 'lens'
  | 'crest';

type Props = {
  label: string;
  icon: string;
  locked?: boolean;
  tier?: BadgeTier;
  shape?: BadgeShape;
  badgeId?: string;
  accent?: string;
};

export const BADGE_SHAPES: Record<string, BadgeShape> = {
  'first-report': 'flag',
  'first-cleanup': 'spark',
  'active-volunteer': 'hands',
  'community-hero': 'trophy',
  'ten-events': 'calendar',
  'the-reporter': 'clipboard',
  'tree-planter': 'leaf',
  'local-legend': 'star',
  'town-lens': 'lens',
  'the-mighty-one': 'crest',
};

/** Compact achievement avatar — unique silhouette per badge type. */
export function AchievementBadge({
  label,
  icon,
  locked = false,
  shape,
  badgeId,
  accent,
}: Props) {
  const resolved = shape ?? (badgeId ? BADGE_SHAPES[badgeId] : undefined) ?? 'crest';
  const fill: [string, string] = locked
    ? ['#B0B0B0', '#7A7A7A']
    : accent
      ? [accent, shade(accent, -28)]
      : ['#2D4F4F', '#243F3F'];
  const rim = locked ? '#9A9A9A' : shade(fill[0], 35);
  // Flag + star silhouettes leave the glow peeking through as a circular watermark
  const showGlow = !locked && resolved !== 'flag' && resolved !== 'star';

  return (
    <View style={[styles.wrap, locked && styles.wrapLocked]}>
      <View style={styles.stage}>
        {showGlow ? (
          <View style={[styles.glow, { backgroundColor: fill[0], shadowColor: fill[0] }]} />
        ) : null}
        <BadgeAvatar shape={resolved} fill={fill} rim={rim} locked={locked} icon={icon} />
      </View>
      <Text style={[styles.label, locked && styles.labelLocked]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function IconMark({
  icon,
  locked,
  size = 15,
  counterRotate,
}: {
  icon: string;
  locked: boolean;
  size?: number;
  counterRotate?: boolean;
}) {
  return (
    <View style={counterRotate ? { transform: [{ rotate: '-45deg' }] } : undefined}>
      <Ionicons
        name={(locked ? 'lock-closed' : icon) as keyof typeof Ionicons.glyphMap}
        size={size}
        color={Colors.white}
      />
    </View>
  );
}

function BadgeAvatar({
  shape,
  fill,
  rim,
  locked,
  icon,
}: {
  shape: BadgeShape;
  fill: [string, string];
  rim: string;
  locked: boolean;
  icon: string;
}) {
  switch (shape) {
    case 'flag':
      return (
        <View style={styles.flagWrap}>
          <View style={[styles.flagPole, { backgroundColor: rim }]} />
          <LinearGradient colors={fill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.flag}>
            <Sheen />
            <IconMark icon={icon} locked={locked} size={13} />
          </LinearGradient>
        </View>
      );

    case 'spark':
      return (
        <LinearGradient colors={fill} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.spark}>
          <Sheen />
          <IconMark icon={icon} locked={locked} size={14} counterRotate />
        </LinearGradient>
      );

    case 'hands':
      return (
        <View style={[styles.shieldOuter, { borderColor: rim }]}>
          <LinearGradient colors={fill} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={styles.shield}>
            <Sheen />
            <IconMark icon={icon} locked={locked} />
          </LinearGradient>
        </View>
      );

    case 'trophy':
      return (
        <View style={styles.trophy}>
          <View style={[styles.handle, styles.handleL, { borderColor: rim }]} />
          <View style={[styles.handle, styles.handleR, { borderColor: rim }]} />
          <LinearGradient colors={fill} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.cup}>
            <Sheen />
            <IconMark icon={icon} locked={locked} size={13} />
          </LinearGradient>
          <View style={[styles.stem, { backgroundColor: rim }]} />
          <View style={[styles.base, { backgroundColor: rim }]} />
        </View>
      );

    case 'calendar':
      return (
        <View style={styles.calWrap}>
          <View style={[styles.calBind, { backgroundColor: rim }]} />
          <LinearGradient colors={fill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.calBody}>
            <Sheen />
            <IconMark icon={icon} locked={locked} />
          </LinearGradient>
        </View>
      );

    case 'clipboard':
      return (
        <View style={styles.clipWrap}>
          <View style={[styles.clipTop, { backgroundColor: rim }]} />
          <LinearGradient colors={fill} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.clipBody}>
            <Sheen />
            <IconMark icon={icon} locked={locked} />
          </LinearGradient>
        </View>
      );

    case 'leaf':
      return (
        <LinearGradient colors={fill} start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.leaf}>
          <Sheen />
          <IconMark icon={icon} locked={locked} />
        </LinearGradient>
      );

    case 'star':
      // Clean ribbon medallion — no circular core (looked like a watermark)
      return (
        <View style={styles.ribbonWrap}>
          <LinearGradient colors={fill} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.ribbonBadge}>
            <IconMark icon={icon} locked={locked} size={15} />
          </LinearGradient>
          <View style={styles.ribbonTails}>
            <View style={[styles.ribbonTail, styles.ribbonTailL, { borderTopColor: fill[1] }]} />
            <View style={[styles.ribbonTail, styles.ribbonTailR, { borderTopColor: fill[0] }]} />
          </View>
        </View>
      );

    case 'lens':
      return (
        <View style={[styles.lensOuter, { borderColor: rim }]}>
          <View style={[styles.lensMid, { borderColor: shade(rim, -20) }]}>
            <LinearGradient colors={fill} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.lensInner}>
              <Sheen />
              <IconMark icon={icon} locked={locked} size={13} />
            </LinearGradient>
          </View>
        </View>
      );

    case 'crest':
      return (
        <View style={styles.crestWrap}>
          <LinearGradient colors={fill} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={styles.crest}>
            <Sheen />
            <IconMark icon={icon} locked={locked} size={16} />
          </LinearGradient>
          <View style={[styles.crestPoint, { borderTopColor: fill[1] }]} />
        </View>
      );
  }
}

function Sheen() {
  return (
    <LinearGradient
      colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.08)', 'transparent']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 0.75 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

function shade(hex: string, amount: number) {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return hex;
  const num = parseInt(raw, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((num >> 16) & 0xff) + amount);
  const g = clamp(((num >> 8) & 0xff) + amount);
  const b = clamp((num & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const styles = StyleSheet.create({
  wrap: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    gap: 4,
  },
  wrapLocked: {
    opacity: 0.5,
  },
  stage: {
    width: 42,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    opacity: 0.28,
    shadowOpacity: 0.45,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 11,
    minHeight: 22,
  },
  labelLocked: {
    color: Colors.textMuted,
  },

  flagWrap: {
    width: 36,
    height: 36,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  flagPole: {
    width: 3,
    height: 34,
    borderRadius: 1,
  },
  flag: {
    width: 26,
    height: 20,
    marginLeft: 1,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  spark: {
    width: 32,
    height: 32,
    borderRadius: 7,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  shieldOuter: {
    width: 34,
    height: 38,
    borderRadius: 17,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderWidth: 2,
    padding: 2,
    overflow: 'hidden',
  },
  shield: {
    flex: 1,
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  trophy: {
    width: 40,
    height: 42,
    alignItems: 'center',
  },
  handle: {
    position: 'absolute',
    top: 5,
    width: 9,
    height: 11,
    borderWidth: 2.5,
    borderRadius: 7,
    backgroundColor: 'transparent',
  },
  handleL: { left: 2, borderRightWidth: 0 },
  handleR: { right: 2, borderLeftWidth: 0 },
  cup: {
    marginTop: 2,
    width: 24,
    height: 18,
    borderRadius: 3,
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 1,
  },
  stem: { width: 4, height: 7, borderRadius: 1, marginTop: 1 },
  base: { width: 16, height: 3.5, borderRadius: 2, marginTop: 1 },

  calWrap: {
    width: 32,
    alignItems: 'center',
  },
  calBind: {
    width: 28,
    height: 5,
    borderRadius: 2,
    zIndex: 1,
  },
  calBody: {
    marginTop: -2,
    width: 32,
    height: 28,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  clipWrap: {
    width: 30,
    alignItems: 'center',
  },
  clipTop: {
    width: 14,
    height: 6,
    borderRadius: 3,
    zIndex: 1,
  },
  clipBody: {
    marginTop: -3,
    width: 28,
    height: 32,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  leaf: {
    width: 30,
    height: 36,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 16,
    transform: [{ rotate: '-18deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  ribbonWrap: {
    alignItems: 'center',
    width: 36,
  },
  ribbonBadge: {
    width: 32,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  ribbonTails: {
    flexDirection: 'row',
    marginTop: -2,
    gap: 2,
  },
  ribbonTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  ribbonTailL: {
    transform: [{ rotate: '12deg' }],
  },
  ribbonTailR: {
    transform: [{ rotate: '-12deg' }],
  },

  lensOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lensMid: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lensInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  crestWrap: {
    alignItems: 'center',
  },
  crest: {
    width: 32,
    height: 30,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  crestPoint: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 16,
    borderRightWidth: 16,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
