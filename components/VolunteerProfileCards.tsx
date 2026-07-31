import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { VolunteerGrowthTree } from '@/components/VolunteerGrowthTree';
import {
  getVolunteerGrowthStage,
  getVolunteerLevelProgress,
  VOLUNTEER_LEVELS,
  type VolunteerLevelId,
} from '@/lib/volunteerLevels';
import type { IdentityCardCaptureRef } from '@/lib/saveViewAsImage';
import { Colors, Radius, Spacing } from '@/constants/theme';

const idCardWatermark = require('../assets/images/town-therapy-club-watermark.png');

type IdentityProps = {
  name: string;
  levelId: VolunteerLevelId;
  levelName: string;
  drives: number;
  hours: number;
  issues: number;
  bio?: string;
  skill?: string;
  availability?: string;
  cardWidth?: number;
  cardHeight?: number;
  onDownload?: () => void;
  downloading?: boolean;
  hideDownloadButton?: boolean;
  style?: ViewStyle;
};

function LevelProgress({
  progress,
  fromLabel,
  toLabel,
  hint,
}: {
  progress: number;
  fromLabel: string;
  toLabel: string;
  hint: string;
}) {
  const widthPct = `${Math.min(100, Math.max(progress * 100, 4))}%` as `${number}%`;

  return (
    <View style={styles.progressBlock}>
      <View style={styles.progressLabels}>
        <Text style={styles.progressStage}>{fromLabel}</Text>
        <Text style={styles.progressStage}>{toLabel}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: widthPct }]} />
      </View>
      <Text style={styles.progressHint}>{hint}</Text>
    </View>
  );
}

export const VolunteerIdentityCard = forwardRef<IdentityCardCaptureRef, IdentityProps>(
  function VolunteerIdentityCard(
  {
    name,
    levelId,
    levelName,
    drives,
    hours,
    issues,
    bio,
    skill,
    availability,
    cardWidth,
    cardHeight,
    onDownload,
    downloading = false,
    hideDownloadButton = false,
    style,
  },
  ref
) {
  const shotRef = useRef<ViewShot>(null);
  const growth = getVolunteerGrowthStage(levelId);

  useImperativeHandle(ref, () => ({
    capture: async () => {
      const capture = shotRef.current?.capture;
      if (!capture) throw new Error('ID card is not ready to capture yet.');
      await new Promise((resolve) => setTimeout(resolve, 80));
      return capture();
    },
  }));

  const showDownload = Boolean(onDownload) && !hideDownloadButton;
  const sized = cardWidth != null && cardHeight != null;
  const cardSizeStyle = useMemo(
    () => (sized ? { width: cardWidth, height: cardHeight } : null),
    [cardHeight, cardWidth, sized]
  );

  return (
    <ViewShot
      ref={shotRef}
      style={[styles.identityCardWrap, cardSizeStyle, style]}
      options={{
        format: 'png',
        quality: 1,
        result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile',
        ...(Platform.OS === 'ios' ? { useRenderInContext: true } : {}),
      }}>
      <View collapsable={false} style={[styles.identityCardShell, cardSizeStyle]}>
      <LinearGradient
        colors={['#0A0A0C', '#1A1A20', '#8A8A94', '#222228']}
        locations={[0, 0.38, 0.52, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.identityCard, sized ? styles.identityCardSized : null, cardSizeStyle]}>
      {showDownload ? (
        <Pressable
          style={[styles.identityDownloadBtn, downloading && styles.identityDownloadBtnDisabled]}
          onPress={onDownload}
          disabled={downloading}
          accessibilityLabel="Download ID card"
          hitSlop={8}>
          {downloading ? (
            <ActivityIndicator color={Colors.silverBright} size="small" />
          ) : (
            <Ionicons name="download-outline" size={18} color={Colors.silverBright} />
          )}
        </Pressable>
      ) : null}
      <View style={styles.identityWatermarkWrap} pointerEvents="none">
        <Image source={idCardWatermark} style={styles.identityWatermarkImage} resizeMode="contain" />
      </View>
      <LinearGradient
        colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 0.45 }}
        style={styles.identitySheen}
        pointerEvents="none"
      />
      <View style={styles.identityContent}>
        <View style={styles.identityTop}>
          <Text style={styles.identityName}>👤 {name}</Text>

          <LinearGradient
            colors={['#D96F2F', Colors.orange, '#F5B07A']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.levelTag, styles.identityLevelTag]}>
            <View style={styles.identityLevelTagDot} />
            <Text style={[styles.levelTagTitle, styles.identityLevelTagText]}>{levelName}</Text>
            <View style={styles.identityLevelTagDivider} />
            <Text style={[styles.levelTagStage, styles.identityLevelTagStage]}>{growth.label}</Text>
          </LinearGradient>

          <Text style={styles.identityStatsLine}>
            📅 {drives} Drive{drives === 1 ? '' : 's'} · ⏱ {hours} Hour{hours === 1 ? '' : 's'} · 📍{' '}
            {issues} Issue{issues === 1 ? '' : 's'}
          </Text>

          {skill?.trim() ? (
            <Text style={styles.identitySkillLine}>
              <Text style={styles.identitySkillLabel}>Skill · </Text>
              {skill.trim()}
            </Text>
          ) : null}

          {availability?.trim() ? (
            <Text style={styles.identitySkillLine}>
              <Text style={styles.identitySkillLabel}>Availability · </Text>
              {availability.trim()}
            </Text>
          ) : null}
        </View>

        {bio?.trim() ? (
          <View style={styles.identityBottom}>
            <View style={styles.identityBioBox}>
              <View style={styles.identityBioLine} />
              <Text style={styles.identityBio} numberOfLines={2}>
                {bio.trim()}
              </Text>
              <View style={styles.identityBioLine} />
            </View>
          </View>
        ) : null}
      </View>
      </LinearGradient>
      </View>
    </ViewShot>
  );
});

type ImpactProps = {
  drives: number;
  hours: number;
  issues: number;
};

export function VolunteerImpactCard({ drives, hours, issues }: ImpactProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionEyebrow}>Your impact</Text>
      <View style={styles.impactRow}>
        <View style={styles.impactCell}>
          <Text style={styles.impactValue}>{drives}</Text>
          <Text style={styles.impactLabel}>Drives{'\n'}Completed</Text>
        </View>
        <View style={styles.impactDivider} />
        <View style={styles.impactCell}>
          <Text style={styles.impactValue}>{hours}h</Text>
          <Text style={styles.impactLabel}>Volunteer{'\n'}Hours</Text>
        </View>
        <View style={styles.impactDivider} />
        <View style={styles.impactCell}>
          <Text style={styles.impactValue}>{issues}</Text>
          <Text style={styles.impactLabel}>Issues{'\n'}Reported</Text>
        </View>
      </View>
    </View>
  );
}

const JOURNEY_SCALE = [0.92, 0.94, 0.96, 0.98, 1, 1.04] as const;

type JourneyProps = {
  levelId: VolunteerLevelId;
  drives: number;
};

function JourneyStage({
  levelId,
  index,
  reached,
  active,
}: {
  levelId: VolunteerLevelId;
  index: number;
  reached: boolean;
  active: boolean;
}) {
  const growth = getVolunteerGrowthStage(levelId);
  const earlyGrowth = growth.id === 'seed' || growth.id === 'sapling';
  const flash = useSharedValue(1);

  useEffect(() => {
    if (!active) {
      flash.value = 1;
      return;
    }
    flash.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [active, flash]);

  const treeStyle = useAnimatedStyle(() => ({
    opacity: active ? flash.value : reached ? 1 : 0.28,
    transform: [{ scale: JOURNEY_SCALE[index] }],
  }));

  return (
    <View style={styles.stageSlot}>
      <View style={styles.stagePad}>
        <Animated.View style={[styles.stageTree, treeStyle]}>
          <VolunteerGrowthTree levelId={levelId} size="sm" bare />
        </Animated.View>
      </View>
      <Text
        style={[
          styles.stageLabel,
          earlyGrowth && reached && { color: Colors.silverMuted, fontWeight: active ? '800' : '700' },
          !earlyGrowth && active && styles.stageLabelActive,
          !reached && styles.stageLabelLocked,
        ]}
        numberOfLines={2}>
        {growth.label}
      </Text>
    </View>
  );
}

export function VolunteerJourneyStrip({ levelId, drives }: JourneyProps) {
  const { current, next, progress, drivesToNext } = getVolunteerLevelProgress(drives);
  const currentGrowth = getVolunteerGrowthStage(current.id);
  const nextGrowth = next ? getVolunteerGrowthStage(next.id) : null;
  const nextMin = next?.minEvents ?? drives;

  return (
    <View style={styles.card}>
      <Text style={styles.journeyTitle}>Your Journey</Text>
      <Text style={styles.journeySubtitle}>From a seed to a mighty tree</Text>

      <View style={styles.grove}>
        <View style={styles.soil} />
        <View style={styles.journeyRow}>
          {VOLUNTEER_LEVELS.map((level, index) => {
            const reached = drives >= level.minEvents;
            const active = level.id === levelId;
            return (
              <JourneyStage
                key={level.id}
                levelId={level.id}
                index={index}
                reached={reached}
                active={active}
              />
            );
          })}
        </View>
      </View>

      {next && nextGrowth ? (
        <LevelProgress
          progress={progress}
          fromLabel={currentGrowth.label}
          toLabel={nextGrowth.label}
          hint={`${drives}/${nextMin} drives to next level${drivesToNext > 0 ? ` · ${drivesToNext} to go` : ''}`}
        />
      ) : null}

      <Text style={styles.journeyNext}>
        {next && nextGrowth
          ? `Next milestone: grow into a ${nextGrowth.label.toLowerCase()}.`
          : 'You’ve grown into a mighty tree for Hazaribagh.'}
      </Text>
      <Text style={styles.journeyCurrent}>
        Now: {currentGrowth.label} · {current.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  identityCardWrap: {
    width: '100%',
    alignSelf: 'stretch',
  },
  identityCardShell: {
    width: '100%',
  },
  identityCard: {
    width: '100%',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(210, 210, 220, 0.28)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  identityCardSized: {
    flex: 1,
  },
  identityDownloadBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  identityDownloadBtnDisabled: {
    opacity: 0.7,
  },
  identitySheen: {
    ...StyleSheet.absoluteFillObject,
  },
  identityWatermarkWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 18,
  },
  identityWatermarkImage: {
    width: '96%',
    height: '88%',
    opacity: 0.2,
  },
  identityContent: {
    zIndex: 1,
    flex: 1,
    justifyContent: 'space-between',
  },
  identityTop: {
    gap: Spacing.sm,
  },
  identityBottom: {
    justifyContent: 'flex-end',
  },
  identityName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F5F5F7',
    letterSpacing: -0.3,
  },
  identityLevelTag: {
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  identityLevelTagText: {
    color: Colors.white,
    opacity: 1,
  },
  identityLevelTagStage: {
    color: Colors.silverBright,
    opacity: 1,
    fontWeight: '800',
  },
  identityLevelTagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  identityLevelTagDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  identityStatsLine: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(235, 235, 240, 0.72)',
    lineHeight: 20,
  },
  identitySkillLine: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.silverBright,
    lineHeight: 19,
  },
  identitySkillLabel: {
    color: 'rgba(200, 200, 210, 0.65)',
    fontWeight: '600',
  },
  identityBioBox: {
    marginTop: Spacing.sm,
    gap: 8,
  },
  identityBioLine: {
    width: '100%',
    height: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(210, 210, 220, 0.45)',
  },
  identityBio: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(245, 245, 250, 0.88)',
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  levelTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    paddingVertical: 6,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    gap: 7,
  },
  levelTagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  levelTagTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  levelTagDivider: {
    width: 1,
    height: 12,
    opacity: 0.35,
  },
  levelTagStage: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.85,
  },
  statsLine: {
    marginTop: Spacing.sm,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  bio: {
    marginTop: Spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
  },
  progressBlock: {
    marginBottom: Spacing.md,
    gap: 8,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStage: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  progressTrack: {
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.greenLight,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  progressHint: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  impactCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  impactDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  impactValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  impactLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
  },
  journeyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  journeySubtitle: {
    marginTop: 2,
    marginBottom: Spacing.md,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  grove: {
    backgroundColor: '#EAF5EC',
    borderRadius: Radius.lg,
    paddingTop: 28,
    paddingBottom: Spacing.sm + 2,
    paddingHorizontal: 6,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#C5DFCA',
  },
  soil: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 34,
    height: 14,
    borderRadius: Radius.pill,
    backgroundColor: '#D9C3A5',
    opacity: 0.95,
  },
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 120,
    paddingBottom: 28,
  },
  stageSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    maxWidth: 60,
  },
  stagePad: {
    height: 68,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  stageTree: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  stageLabel: {
    marginTop: 4,
    fontSize: 8,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 10,
  },
  stageLabelActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  stageLabelLocked: {
    color: Colors.textMuted,
  },
  journeyNext: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  journeyCurrent: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
});
