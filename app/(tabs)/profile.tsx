import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AchievementBadge, type BadgeTier } from '@/components/AchievementBadge';
import { AboutYouSection } from '@/components/AboutYouSection';
import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';
import { ConfirmDrivesSection } from '@/components/ConfirmDrivesSection';
import { TakeBreakModal } from '@/components/TakeBreakModal';
import { TownTherapyLogo } from '@/components/TownTherapyLogo';
import { VolunteerGrowthTree } from '@/components/VolunteerGrowthTree';
import {
  VolunteerIdentityCard,
  VolunteerImpactCard,
  VolunteerJourneyStrip,
} from '@/components/VolunteerProfileCards';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useVolunteer } from '@/context/VolunteerContext';
import { brand } from '@/constants/data';
import { getVolunteerIdCardDimensions, PROFILE_PAGE_GUTTER } from '@/constants/profileLayout';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { evaluateBadges, EMPTY_BADGE_STATS } from '@/lib/badges';
import { saveViewAsImage, type IdentityCardCaptureRef } from '@/lib/saveViewAsImage';
import { hoursFromDrives } from '@/lib/volunteerHours';
import { getVolunteerGrowthStage, getVolunteerLevel } from '@/lib/volunteerLevels';
import { coalesceVolunteerPref } from '@/constants/volunteerProfile';
import { useCollapsedSection } from '@/hooks/useCollapsedSection';
import { useTownGreeting } from '@/hooks/useTownGreeting';
import { normalizeVolunteerName } from '@/lib/volunteerName';
import type { Badge } from '@/types/database';
import { townAlert } from '@/context/TownAlertContext';

function BadgeGrid({ badgeList }: { badgeList: Badge[] }) {
  const unlocked = badgeList.filter((b) => !b.locked).length;
  const { collapsed, toggle } = useCollapsedSection('profile-achievements');

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderCopy}>
          <Text style={[styles.sectionTitle, styles.sectionTitleInHeader]}>Achievements</Text>
          <Text style={styles.sectionCount}>
            {unlocked}/{badgeList.length} earned
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.collapseBtn, pressed && styles.collapseBtnPressed]}
          onPress={toggle}
          hitSlop={8}
          accessibilityLabel={collapsed ? 'Expand achievements' : 'Minimize achievements'}
          accessibilityRole="button">
          <Ionicons
            name={collapsed ? 'chevron-down' : 'chevron-up'}
            size={18}
            color={Colors.primary}
          />
        </Pressable>
      </View>
      {!collapsed ? (
        <View style={styles.badgeShelf}>
          <View style={styles.badgeGrid}>
            {badgeList.map((badge) => (
              <AchievementBadge
                key={badge.id}
                badgeId={badge.id}
                label={badge.label}
                icon={badge.icon}
                locked={badge.locked}
                shape={badge.shape}
                tier={(badge.tier as BadgeTier | undefined) ?? 'gold'}
                accent={badge.locked ? undefined : badge.color}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function MenuRow({
  icon,
  title,
  subtitle,
  onPress,
  tone = 'default',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  tone?: 'default' | 'warm' | 'muted';
}) {
  const bg =
    tone === 'warm' ? Colors.orangeLight : tone === 'muted' ? Colors.cardLight : Colors.white;
  const iconColor = tone === 'warm' ? Colors.orange : Colors.primary;

  return (
    <Pressable style={[styles.menuRow, { backgroundColor: bg }]} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: tone === 'warm' ? '#FFE8D6' : Colors.greenLight }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const idCardDimensions = useMemo(
    () => getVolunteerIdCardDimensions(screenWidth),
    [screenWidth]
  );
  const { profile, newsletter, guestId, refresh, takeVolunteerBreak, resumeVolunteer, updateProfile, statsReady } =
    useVolunteer();
  const { admin } = useAdminAuth();
  const [badgeList, setBadgeList] = useState<Badge[]>(() => evaluateBadges(EMPTY_BADGE_STATS));
  const [takingBreak, setTakingBreak] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);
  const [downloadingCard, setDownloadingCard] = useState(false);
  const [capturingCard, setCapturingCard] = useState(false);
  const idCardRef = useRef<IdentityCardCaptureRef>(null);

  const isRegistered = Boolean(profile?.registered);
  const isOnBreak = Boolean(newsletter) && !isRegistered;
  // Wait for reconcile so we never flash stale AsyncStorage counters (old Math.max inflation).
  const eventsAttended = !statsReady
    ? 0
    : Math.max(0, Number(newsletter?.events_attended ?? profile?.events_joined ?? 0) || 0);
  const reportsFlagged = !statsReady
    ? 0
    : Math.max(0, Number(newsletter?.reports_flagged ?? profile?.reports_submitted ?? 0) || 0);
  // Hours always track completed drives — never trust a separate stored hours field.
  const hoursVolunteered = hoursFromDrives(eventsAttended);
  const level = useMemo(() => getVolunteerLevel(eventsAttended), [eventsAttended]);
  const growth = useMemo(() => getVolunteerGrowthStage(level.id), [level.id]);

  const displayName = normalizeVolunteerName(profile?.full_name || newsletter?.full_name);
  const firstName = displayName.split(/\s+/).filter(Boolean)[0] || 'Volunteer';
  const greeting = useTownGreeting();
  const aboutBio = coalesceVolunteerPref(profile?.bio, newsletter?.bio);
  const aboutCause = coalesceVolunteerPref(profile?.interests, newsletter?.cause);
  const aboutSkill = coalesceVolunteerPref(profile?.skills, newsletter?.skills);
  const aboutAvailability = coalesceVolunteerPref(profile?.availability, newsletter?.availability);

  useFocusEffect(
    useCallback(() => {
      // Soft refresh only — full recount happens after complete/report or in background
      void refresh();
    }, [refresh])
  );

  useEffect(() => {
    if (!guestId) return;
    api.listBadges(guestId).then(setBadgeList);
  }, [guestId, eventsAttended, reportsFlagged]);

  const saveAboutYou = async (input: {
    bio: string;
    interests: string;
    skills: string;
    availability: string;
  }) => {
    setSavingAbout(true);
    try {
      await updateProfile(input);
    } catch (error) {
      townAlert('Could not save', error instanceof Error ? error.message : 'Try again.');
      throw error;
    } finally {
      setSavingAbout(false);
    }
  };

  const confirmTakeBreak = async (prefs: { event_updates: boolean; town_newsletter: boolean }) => {
    setTakingBreak(true);
    try {
      await takeVolunteerBreak(prefs);
      setShowBreakModal(false);

      const kept: string[] = [];
      if (prefs.event_updates) kept.push('future events');
      if (prefs.town_newsletter) kept.push('email updates');

      townAlert(
        'Rest well',
        kept.length
          ? `You're on a break. We'll still send ${kept.join(' and ')}. Resume anytime.`
          : "You're on a break. You won't get event or email updates unless you turn them back on."
      );
    } catch (error) {
      townAlert('Could not update', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setTakingBreak(false);
    }
  };

  const handleResume = async () => {
    setResuming(true);
    try {
      await resumeVolunteer();
      townAlert('Welcome back', 'You’re an active Town Therapy volunteer again.');
    } catch (error) {
      townAlert('Could not resume', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setResuming(false);
    }
  };

  const downloadIdCard = async () => {
    if (downloadingCard) return;
    setDownloadingCard(true);
    try {
      setCapturingCard(true);
      await new Promise((resolve) => setTimeout(resolve, 120));
      const slug = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const result = await saveViewAsImage(idCardRef, {
        filename: `town-therapy-id-${slug || 'volunteer'}`,
        dialogTitle: 'Save your volunteer ID card',
      });

      if (result.mode === 'saved' && result.savedToPhotos) {
        townAlert('Saved', 'Your ID card was saved to this device and your photos.');
      } else if (result.mode === 'saved') {
        townAlert('Saved', 'Your ID card was saved on this device.');
      } else {
        townAlert(
          'Saved on device',
          'Your ID card is stored on this phone. Use the share sheet if you also want a copy in Photos.'
        );
      }
    } catch (error) {
      townAlert('Could not download', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setCapturingCard(false);
      setDownloadingCard(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAwareScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.hero}>
          <View style={styles.heroTop}>
            <TownTherapyLogo size={46} withShadow />
            <View style={styles.brandCopy}>
              <Text style={styles.brandMark}>{brand.name}</Text>
              <Text style={styles.brandTagline}>{brand.tagline}...</Text>
            </View>
          </View>

          <Text style={styles.greetingLine}>{greeting},</Text>
          <Text style={styles.greetingName}>{firstName}</Text>
          <Text style={styles.greetingSub}>
            {isRegistered
              ? `You're a ${level.name} — your ${growth.label.toLowerCase()} grows with every completed drive.`
              : isOnBreak
                ? "You're taking a break. Resume whenever you're ready — your seed is still here."
                : 'Create your volunteer profile and start healing Hazaribagh with us.'}
          </Text>

          {isRegistered ? (
            <View style={[styles.idCardSlot, idCardDimensions]}>
              <VolunteerIdentityCard
                ref={idCardRef}
                name={displayName}
                levelId={level.id}
                levelName={level.name}
                drives={eventsAttended}
                hours={hoursVolunteered}
                issues={reportsFlagged}
                bio={aboutBio}
                skill={aboutSkill}
                availability={aboutAvailability}
                cardWidth={idCardDimensions.width}
                cardHeight={idCardDimensions.height}
                onDownload={downloadIdCard}
                hideDownloadButton={capturingCard}
                downloading={downloadingCard}
              />
            </View>
          ) : isOnBreak ? (
            <View style={styles.breakCard}>
              <View style={styles.breakCardTop}>
                <VolunteerGrowthTree levelId={level.id} size="md" />
                <View style={styles.breakCardText}>
                  <Text style={styles.breakBadge}>On a break</Text>
                  <Text style={styles.breakCardTitle}>{displayName}</Text>
                  <Text style={styles.breakCardSubtitle}>
                    {[
                      newsletter?.event_updates ? 'Future events on' : null,
                      newsletter?.town_newsletter ? 'Email updates on' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'No email updates right now'}
                  </Text>
                </View>
              </View>
              <Pressable
                style={[styles.resumeButton, resuming && styles.breakButtonDisabled]}
                onPress={handleResume}
                disabled={resuming}>
                <Text style={styles.resumeButtonText}>
                  {resuming ? 'Resuming…' : 'Resume volunteering'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.joinCard} onPress={() => router.push('/newsletter')}>
              <View style={styles.joinIcon}>
                <Ionicons name="heart" size={22} color={Colors.orange} />
              </View>
              <View style={styles.joinText}>
                <Text style={styles.joinTitle}>Become a volunteer</Text>
                <Text style={styles.joinSubtitle}>Sign up to unlock levels, badges, and your growth tree.</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
            </Pressable>
          )}
        </LinearGradient>

        {isRegistered ? (
          <View style={styles.section}>
            <VolunteerImpactCard
              drives={eventsAttended}
              hours={hoursVolunteered}
              issues={reportsFlagged}
            />
          </View>
        ) : null}

        {isRegistered && guestId ? (
          <View style={styles.section}>
            <ConfirmDrivesSection guestId={guestId} onCompleted={() => void refresh({ reconcile: true })} />
          </View>
        ) : null}

        {isRegistered ? (
          <View style={styles.section}>
            <VolunteerJourneyStrip levelId={level.id} drives={eventsAttended} />
          </View>
        ) : null}

        {isRegistered ? <BadgeGrid badgeList={badgeList} /> : null}

        {isRegistered ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About you</Text>
            <AboutYouSection
              bio={aboutBio}
              cause={aboutCause}
              skill={aboutSkill}
              availability={aboutAvailability}
              saving={savingAbout}
              onSave={saveAboutYou}
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More</Text>
          <MenuRow
            icon="sparkles"
            title="Dr. Rant"
            subtitle="Your civic coach — tips, cleanups, and sustainable living"
            tone="warm"
            onPress={() => router.push('/assistant' as Href)}
          />
          <MenuRow
            icon="shield-outline"
            title={admin ? 'Admin panel' : 'Admin login'}
            subtitle={admin ? 'Manage civic reports' : 'Town admins only'}
            onPress={() => router.push(admin ? '/admin' : '/admin/login')}
          />
        </View>

        {isRegistered ? (
          <Pressable
            style={[styles.breakButton, takingBreak && styles.breakButtonDisabled]}
            onPress={() => setShowBreakModal(true)}
            disabled={takingBreak}>
            <Ionicons name="leaf-outline" size={18} color={Colors.primary} />
            <Text style={styles.breakButtonText}>Take a Break</Text>
          </Pressable>
        ) : null}

        <View style={styles.footerBlock}>
          <Text style={styles.footerBrand}>{brand.name}</Text>
          <Text style={styles.footerLocation}>{brand.location}</Text>
          <View style={styles.footerDivider} />
          <Text style={styles.footerLinkLead}>For more information visit</Text>
          <Pressable
            style={({ pressed }) => [styles.footerLinkBtn, pressed && styles.footerLinkBtnPressed]}
            onPress={() => void Linking.openURL(brand.website)}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel="Visit towntherapy.club">
            <Text style={styles.footerLinkUrl}>towntherapy.club</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>

      <TakeBreakModal
        visible={showBreakModal}
        loading={takingBreak}
        initialEventUpdates={newsletter?.event_updates ?? true}
        initialTownNewsletter={newsletter?.town_newsletter ?? true}
        onCancel={() => setShowBreakModal(false)}
        onConfirm={confirmTakeBreak}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: Spacing.xl,
  },
  hero: {
    paddingHorizontal: PROFILE_PAGE_GUTTER,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
    alignItems: 'stretch',
  },
  idCardSlot: {
    alignSelf: 'center',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 2,
  },
  brandMark: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 0.15,
    lineHeight: 32,
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  brandTagline: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.88)',
    letterSpacing: 0.7,
    lineHeight: 17,
    marginLeft: 1,
  },
  greetingLine: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.88)',
  },
  greetingName: {
    marginTop: 2,
    fontSize: 34,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  greetingSub: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.82)',
  },
  joinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  joinIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.orangeLight,
  },
  joinText: {
    flex: 1,
    minWidth: 0,
  },
  joinTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  joinSubtitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  breakCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  breakCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  breakCardText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  breakBadge: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.orange,
  },
  breakCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  breakCardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  resumeButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryDark,
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  resumeButtonText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  section: {
    marginTop: Spacing.lg,
    paddingHorizontal: PROFILE_PAGE_GUTTER,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  collapseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.greenLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  collapseBtnPressed: {
    opacity: 0.75,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  sectionTitleInHeader: {
    marginBottom: 0,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  badgeShelf: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    rowGap: 4,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.greenLight,
    marginTop: 2,
  },
  infoCopy: {
    flex: 1,
    minWidth: 0,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  infoValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 22,
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  menuSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  breakButton: {
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
    shadowColor: Colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  breakButtonDisabled: {
    opacity: 0.6,
  },
  breakButtonText: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 15,
  },
  footerBlock: {
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: Spacing.xl,
    marginHorizontal: PROFILE_PAGE_GUTTER,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: 4,
  },
  footerBrand: {
    width: '100%',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },
  footerLocation: {
    width: '100%',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  footerDivider: {
    width: 40,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  footerLinkLead: {
    width: '100%',
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  footerLinkBtn: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
  },
  footerLinkBtnPressed: {
    opacity: 0.7,
  },
  footerLinkUrl: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
