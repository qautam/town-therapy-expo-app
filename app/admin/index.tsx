import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventDateTimePicker } from '@/components/EventDateTimePicker';
import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { DEPARTMENT_DEFINITIONS, isValidEmail, resolveDepartmentDefinition } from '@/constants/departments';
import { reportSeverityMeta } from '@/constants/reports';
import { VOLUNTEER_SKILLS } from '@/constants/volunteerProfile';
import { api, formatEventDateParts } from '@/lib/api';
import { isSupabaseConfigured } from '@/lib/config';
import { hoursFromDrives } from '@/lib/volunteerHours';
import { buildContactDrafts, resolveRouteForCategory } from '@/lib/departmentContacts';
import { confirmForwardReport, forwardReportToDepartment } from '@/lib/forwardReport';
import { formatCoords, mapsUrl } from '@/lib/location';
import {
  composeVolunteerNewsletter,
  confirmVolunteerNewsletter,
  filterVolunteerContacts,
  type VolunteerMailContact,
  type VolunteerNewsletterAudience,
} from '@/lib/volunteerNewsletter';
import type { EmergencyAlert, Event, Report, UpdateEventInput, VolunteerDirectoryEntry } from '@/types/database';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { OptionPickerModal } from '@/components/OptionPickerModal';
import {
  STICKY_NOTE_TTL_DAYS,
  formatStickyNoteRemaining,
  type StickyNote,
} from '@/lib/stickyNotes';
import { townAlert } from '@/context/TownAlertContext';

const statusOptions: Report['status'][] = ['open', 'in_progress', 'resolved'];

type AdminSection =
  | 'reports'
  | 'authorities'
  | 'events'
  | 'volunteers'
  | 'emergencies'
  | 'newsletter'
  | 'chalkboard';

const ADMIN_TABS: {
  id: AdminSection;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'reports', label: 'Reports', subtitle: 'Citizen issues', icon: 'document-text-outline' },
  { id: 'authorities', label: 'Authorities', subtitle: 'Department emails', icon: 'business-outline' },
  { id: 'events', label: 'Events', subtitle: 'Create & manage', icon: 'calendar-outline' },
  { id: 'chalkboard', label: 'Chalkboard', subtitle: 'Pin town notes', icon: 'easel-outline' },
  { id: 'volunteers', label: 'Volunteers', subtitle: 'Find by skill', icon: 'people-outline' },
  { id: 'newsletter', label: 'Newsletter', subtitle: 'Email volunteers', icon: 'mail-outline' },
  { id: 'emergencies', label: 'SOS Alerts', subtitle: 'Live emergencies', icon: 'warning-outline' },
];

const NEWSLETTER_AUDIENCES: {
  id: VolunteerNewsletterAudience;
  label: string;
  hint: string;
}[] = [
  {
    id: 'all',
    label: 'Everyone who signed up',
    hint: 'All volunteers who registered at any point, including those on a break',
  },
  {
    id: 'town_newsletter',
    label: 'Email updates on',
    hint: 'Only people who opted into town newsletter emails',
  },
  {
    id: 'event_updates',
    label: 'Event updates on',
    hint: 'Only people who opted into future event alerts',
  },
];

function defaultEventStart() {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  date.setHours(9, 0, 0, 0);
  return date;
}

export default function AdminPanelScreen() {
  const router = useRouter();
  const { admin, loading: authLoading, signOut } = useAdminAuth();
  const [section, setSection] = useState<AdminSection>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyAlert[]>([]);
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [pinningNoteId, setPinningNoteId] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [volunteerContacts, setVolunteerContacts] = useState<VolunteerMailContact[]>([]);
  const [skillFilter, setSkillFilter] = useState<string>('');
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [skillMatches, setSkillMatches] = useState<VolunteerDirectoryEntry[]>([]);
  const [newsletterAudience, setNewsletterAudience] =
    useState<VolunteerNewsletterAudience>('all');
  const [newsletterSubject, setNewsletterSubject] = useState('Town Therapy update');
  const [newsletterMessage, setNewsletterMessage] = useState('');
  const [sendingNewsletter, setSendingNewsletter] = useState(false);
  const [contactDrafts, setContactDrafts] = useState<Record<string, string>>({});
  const [savingContactId, setSavingContactId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [forwardingId, setForwardingId] = useState<string | null>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventCategory, setEventCategory] = useState('Cleanup');
  const [eventLocation, setEventLocation] = useState('Hazaribagh');
  const [eventPhotoUri, setEventPhotoUri] = useState<string | null>(null);
  const [eventExistingImageUrl, setEventExistingImageUrl] = useState<string | null>(null);
  const [removeEventPhoto, setRemoveEventPhoto] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventStartsAt, setEventStartsAt] = useState(defaultEventStart);

  const loadReports = useCallback(async () => {
    const data = await api.listAllReportsForAdmin();
    setReports(data);
  }, []);

  const loadEmergencies = useCallback(async () => {
    const data = await api.listAllEmergencyAlerts();
    setEmergencies(data.filter((alert) => alert.status !== 'resolved').slice(0, 20));
  }, []);

  const loadStickyNotes = useCallback(async () => {
    const data = await api.listStickyNotes();
    setStickyNotes(data);
  }, []);

  const loadEvents = useCallback(async () => {
    const data = await api.listEvents(null);
    setEvents(data);
  }, []);

  const loadDepartmentContacts = useCallback(async () => {
    const contacts = await api.listDepartmentContacts();
    setContactDrafts(buildContactDrafts(contacts));
  }, []);

  const loadVolunteerContacts = useCallback(async () => {
    const contacts = await api.listVolunteerContacts();
    setVolunteerContacts(contacts);
  }, []);

  const loadSkillMatches = useCallback(async (skill: string) => {
    if (!skill) {
      setSkillMatches([]);
      return;
    }
    const matches = await api.listVolunteersBySkill(skill);
    setSkillMatches(matches);
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([
      loadReports(),
      loadEvents(),
      loadEmergencies(),
      loadStickyNotes(),
      loadDepartmentContacts(),
      loadVolunteerContacts(),
    ]);
    if (skillFilter) {
      await loadSkillMatches(skillFilter);
    }
  }, [
    loadReports,
    loadEvents,
    loadEmergencies,
    loadStickyNotes,
    loadDepartmentContacts,
    loadVolunteerContacts,
    loadSkillMatches,
    skillFilter,
  ]);

  useEffect(() => {
    if (authLoading) return;
    if (!admin) {
      router.replace('/admin/login');
      return;
    }
    loadAll().finally(() => setLoading(false));
  }, [admin, authLoading, loadAll, router]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const updateStatus = async (reportId: string, status: Report['status']) => {
    try {
      await api.updateReportStatus(reportId, status);
      await loadReports();
    } catch (error) {
      townAlert('Update failed', error instanceof Error ? error.message : 'Try again.');
    }
  };

  const deleteReport = (report: Report) => {
    townAlert(
      'Delete report?',
      `Remove "${report.title}" permanently? Use this for spam or duplicate reports.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingReportId(report.id);
            try {
              await api.deleteReport(report.id);
              await loadReports();
            } catch (error) {
              townAlert('Delete failed', error instanceof Error ? error.message : 'Try again.');
            } finally {
              setDeletingReportId(null);
            }
          },
        },
      ]
    );
  };

  const updateContactDraft = (departmentId: string, email: string) => {
    setContactDrafts((current) => ({ ...current, [departmentId]: email }));
  };

  const saveDepartmentContact = async (departmentId: string) => {
    const email = contactDrafts[departmentId]?.trim() ?? '';
    if (!isValidEmail(email)) {
      townAlert('Invalid email', 'Enter a valid authority email address.');
      return;
    }

    setSavingContactId(departmentId);
    try {
      await api.saveDepartmentContact(departmentId, email);
      townAlert('Saved', 'Authority email updated.');
    } catch (error) {
      townAlert('Save failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSavingContactId(null);
    }
  };

  const sendReportToDepartment = (report: Report) => {
    const route = resolveRouteForCategory(report.category, contactDrafts);
    confirmForwardReport(report, route, async () => {
      setForwardingId(report.id);
      try {
        if (isValidEmail(route.email)) {
          await api.saveDepartmentContact(route.id, route.email);
        }

        const sent = await forwardReportToDepartment(report, route);
        if (!sent) return;

        await api.markReportForwarded(report.id, route.email);
        await loadReports();
        townAlert('Report forwarded', `Email sent to ${route.department}.`);
      } catch (error) {
        townAlert('Could not send', error instanceof Error ? error.message : 'Try again.');
      } finally {
        setForwardingId(null);
      }
    });
  };

  const resolveEmergency = async (alertId: string) => {
    try {
      await api.resolveEmergencyAlert(alertId);
      await loadEmergencies();
    } catch (error) {
      townAlert('Update failed', error instanceof Error ? error.message : 'Try again.');
    }
  };

  const toggleStickyPin = async (note: StickyNote) => {
    setPinningNoteId(note.id);
    try {
      const next = await api.setStickyNotePinned(note.id, !note.pinned);
      setStickyNotes(next);
    } catch (error) {
      townAlert(
        'Could not update pin',
        error instanceof Error
          ? error.message
          : 'Make sure you are signed in as admin and sticky-notes.sql has been applied.'
      );
    } finally {
      setPinningNoteId(null);
    }
  };

  const eraseStickyNote = (note: StickyNote) => {
    townAlert('Erase chalkboard note?', `"${note.body.slice(0, 60)}${note.body.length > 60 ? '…' : ''}"`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Erase',
        style: 'destructive',
        onPress: async () => {
          setDeletingNoteId(note.id);
          try {
            const next = await api.deleteStickyNoteAsAdmin(note.id);
            setStickyNotes(next);
          } catch (error) {
            townAlert('Erase failed', error instanceof Error ? error.message : 'Try again.');
          } finally {
            setDeletingNoteId(null);
          }
        },
      },
    ]);
  };

  const resetEventForm = () => {
    setEditingEventId(null);
    setEventTitle('');
    setEventDescription('');
    setEventCategory('Cleanup');
    setEventLocation('Hazaribagh');
    setEventPhotoUri(null);
    setEventExistingImageUrl(null);
    setRemoveEventPhoto(false);
    setEventStartsAt(defaultEventStart());
    setShowCreateEvent(false);
  };

  const startEditEvent = (event: Event) => {
    setEditingEventId(event.id);
    setEventTitle(event.title);
    setEventDescription(event.description);
    setEventCategory(event.category);
    setEventLocation(event.location_label);
    setEventStartsAt(new Date(event.starts_at));
    setEventPhotoUri(null);
    setEventExistingImageUrl(event.image_url);
    setRemoveEventPhoto(false);
    setShowCreateEvent(true);
  };

  const saveEvent = async () => {
    if (!eventTitle.trim() || !eventLocation.trim()) {
      townAlert('Missing details', 'Add an event title and location.');
      return;
    }

    setCreatingEvent(true);
    try {
      const input: UpdateEventInput = {
        title: eventTitle.trim(),
        description: eventDescription.trim(),
        category: eventCategory.trim() || 'Cleanup',
        location_label: eventLocation.trim(),
        starts_at: eventStartsAt.toISOString(),
        image_uri: eventPhotoUri ?? undefined,
        remove_image: removeEventPhoto && !eventPhotoUri,
      };

      if (editingEventId) {
        await api.updateEvent(editingEventId, input);
        townAlert(
          'Event updated',
          isSupabaseConfigured
            ? 'Your changes are now live for all volunteers. Ask them to pull to refresh if they already had Events open.'
            : 'Saved on this device only. Connect Supabase (EXPO_PUBLIC_SUPABASE_URL + ANON_KEY) so volunteers on other phones can see it.'
        );
      } else {
        await api.createEvent(input);
        townAlert(
          'Event published',
          isSupabaseConfigured
            ? 'Volunteers with event updates enabled will get a push notification on their device.'
            : 'Published on this device only. Without Supabase, other phones keep their own local data and will not see this event.'
        );
      }

      resetEventForm();
    } catch (error) {
      townAlert(
        editingEventId ? 'Update failed' : 'Create failed',
        error instanceof Error ? error.message : 'Try again.'
      );
    } finally {
      setCreatingEvent(false);
      // Refresh list separately so a list error doesn't look like publish failed
      try {
        await loadEvents();
      } catch {
        // ignore
      }
    }
  };

  const pickEventPhoto = () => {
    townAlert('Add event photo', 'Upload a cover image for this event.', [
      {
        text: 'Take photo',
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            townAlert('Camera access needed', 'Enable camera access to photograph the event.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.85,
          });
          if (!result.canceled) {
            setEventPhotoUri(result.assets[0].uri);
            setRemoveEventPhoto(false);
          }
        },
      },
      {
        text: 'Choose from gallery',
        onPress: async () => {
          const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            townAlert('Photos access needed', 'Enable photo library access to attach an image.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.85,
          });
          if (!result.canceled) {
            setEventPhotoUri(result.assets[0].uri);
            setRemoveEventPhoto(false);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const deleteEvent = (event: Event) => {
    townAlert('Delete event?', `Remove "${event.title}" from upcoming events?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingEventId(event.id);
          try {
            await api.deleteEvent(event.id);
            if (editingEventId === event.id) resetEventForm();
            await loadEvents();
          } catch (error) {
            townAlert('Delete failed', error instanceof Error ? error.message : 'Try again.');
          } finally {
            setDeletingEventId(null);
          }
        },
      },
    ]);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(tabs)/profile');
  };

  const newsletterRecipientCount = filterVolunteerContacts(
    volunteerContacts,
    newsletterAudience
  ).length;

  const sendVolunteerNewsletter = () => {
    const audienceLabel =
      NEWSLETTER_AUDIENCES.find((item) => item.id === newsletterAudience)?.label ?? 'selected audience';

    confirmVolunteerNewsletter(newsletterRecipientCount, audienceLabel, async () => {
      setSendingNewsletter(true);
      try {
        const sent = await composeVolunteerNewsletter({
          contacts: volunteerContacts,
          audience: newsletterAudience,
          subject: newsletterSubject,
          message: newsletterMessage,
        });
        if (sent) {
          townAlert(
            'Mail opened',
            `Your email app is ready with ${newsletterRecipientCount} volunteer${newsletterRecipientCount === 1 ? '' : 's'} in BCC.`
          );
        }
      } catch (error) {
        townAlert('Could not open mail', error instanceof Error ? error.message : 'Try again.');
      } finally {
        setSendingNewsletter(false);
      }
    });
  };

  if (authLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={Colors.primary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Admin panel</Text>
          <Text style={styles.subtitle}>Manage reports, events, and SOS alerts.</Text>
        </View>
        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>

      {!isSupabaseConfigured ? (
        <View style={styles.localModeBanner}>
          <Ionicons name="cloud-offline-outline" size={18} color={Colors.orange} />
          <Text style={styles.localModeText}>
            Local demo mode — events and reports stay on this phone. Add Supabase keys in `.env` to sync with volunteers.
          </Text>
        </View>
      ) : null}

      <View style={styles.menuGrid}>
        {ADMIN_TABS.map((tab) => {
          const isActive = section === tab.id;
          const count =
            tab.id === 'reports'
              ? reports.length
              : tab.id === 'events'
                ? events.length
                : tab.id === 'emergencies'
                  ? emergencies.length
                  : tab.id === 'chalkboard'
                    ? stickyNotes.length
                    : tab.id === 'volunteers' || tab.id === 'newsletter'
                      ? volunteerContacts.length
                      : null;

          return (
            <Pressable
              key={tab.id}
              style={[styles.menuButton, isActive && styles.menuButtonActive]}
              onPress={() => setSection(tab.id)}>
              <View style={[styles.menuIconWrap, isActive && styles.menuIconWrapActive]}>
                <Ionicons
                  name={tab.icon}
                  size={22}
                  color={isActive ? Colors.white : Colors.primary}
                />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>{tab.label}</Text>
                <Text style={[styles.menuSubtitle, isActive && styles.menuSubtitleActive]}>
                  {tab.subtitle}
                </Text>
              </View>
              {count != null && count > 0 ? (
                <View style={[styles.menuBadge, isActive && styles.menuBadgeActive]}>
                  <Text style={[styles.menuBadgeText, isActive && styles.menuBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {ADMIN_TABS.find((tab) => tab.id === section)?.label}
        </Text>
      </View>

      {section === 'volunteers' ? (
        <KeyboardAwareScrollView contentContainerStyle={styles.form}>
          <View style={styles.infoBanner}>
            <Ionicons name="people-outline" size={18} color={Colors.primary} />
            <Text style={styles.infoBannerText}>
              Search volunteers by skill to find the right people for a drive or task.
            </Text>
          </View>

          <Text style={styles.fieldLabel}>Skill</Text>
          <Pressable style={styles.skillSelect} onPress={() => setShowSkillPicker(true)}>
            <Text style={[styles.skillSelectText, !skillFilter && styles.skillSelectPlaceholder]}>
              {skillFilter || 'Choose a skill'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
          </Pressable>

          {skillFilter ? (
            <Pressable
              style={styles.clearSkill}
              onPress={() => {
                setSkillFilter('');
                setSkillMatches([]);
              }}>
              <Text style={styles.clearSkillText}>Clear filter</Text>
            </Pressable>
          ) : null}

          {skillFilter ? (
            <>
              <Text style={styles.skillResultCount}>
                {skillMatches.length} volunteer{skillMatches.length === 1 ? '' : 's'} with “{skillFilter}”
              </Text>
              {skillMatches.length === 0 ? (
                <Text style={styles.empty}>
                  No volunteers have chosen this skill yet. Ask them to set Skills in About you.
                </Text>
              ) : (
                skillMatches.map((volunteer) => (
                  <View key={`${volunteer.email}-${volunteer.guest_id}`} style={styles.volunteerRow}>
                    <View style={styles.volunteerAvatar}>
                      <Text style={styles.volunteerAvatarText}>
                        {(volunteer.full_name || 'V').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.volunteerText}>
                      <Text style={styles.volunteerName}>{volunteer.full_name || 'Volunteer'}</Text>
                      <Text style={styles.volunteerEmail}>{volunteer.email}</Text>
                      <Text style={styles.volunteerMeta}>
                        {[
                          volunteer.cause,
                          volunteer.availability,
                          `${volunteer.events_attended} drives completed`,
                          `${volunteer.hours_volunteered ?? hoursFromDrives(volunteer.events_attended)}h`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                      {volunteer.bio ? (
                        <Text style={styles.volunteerBio} numberOfLines={2}>
                          {volunteer.bio}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </>
          ) : (
            <Text style={styles.empty}>Pick a skill above to see matching volunteers.</Text>
          )}

          <OptionPickerModal
            visible={showSkillPicker}
            title="Filter by skill"
            options={VOLUNTEER_SKILLS}
            value={skillFilter}
            onSelect={(value) => {
              setSkillFilter(value);
              void loadSkillMatches(value);
            }}
            onClose={() => setShowSkillPicker(false)}
          />
        </KeyboardAwareScrollView>
      ) : section === 'authorities' ? (
        <KeyboardAwareScrollView contentContainerStyle={styles.form}>
          <View style={styles.infoBanner}>
            <Ionicons name="mail-outline" size={18} color={Colors.primary} />
            <Text style={styles.infoBannerText}>
              Set the official email for each authority. Reports will use these when you forward them.
            </Text>
          </View>
          {DEPARTMENT_DEFINITIONS.map((definition) => (
            <View key={definition.id} style={styles.authorityCard}>
              <Text style={styles.authorityTitle}>{definition.name}</Text>
              <Text style={styles.authorityHint}>
                Used for: {definition.categoryLabels.join(', ')}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Authority email address"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={contactDrafts[definition.id] ?? ''}
                onChangeText={(value) => updateContactDraft(definition.id, value)}
              />
              <Pressable
                style={styles.saveContactButton}
                onPress={() => saveDepartmentContact(definition.id)}
                disabled={savingContactId === definition.id}>
                {savingContactId === definition.id ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.saveContactButtonText}>Save email</Text>
                )}
              </Pressable>
            </View>
          ))}
        </KeyboardAwareScrollView>
      ) : section === 'newsletter' ? (
        <KeyboardAwareScrollView
          contentContainerStyle={styles.form}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          keyboardShouldPersistTaps="handled">
          <View style={styles.infoBanner}>
            <Ionicons name="people-outline" size={18} color={Colors.primary} />
            <Text style={styles.infoBannerText}>
              Email everyone who has signed up for Town Therapy — including volunteers currently on a
              break. Messages open in your mail app with recipients in BCC.
            </Text>
          </View>

          <View style={styles.newsletterStatCard}>
            <Text style={styles.newsletterStatValue}>{volunteerContacts.length}</Text>
            <Text style={styles.newsletterStatLabel}>registered volunteer emails</Text>
            <Text style={styles.newsletterStatHint}>
              {newsletterRecipientCount} in current audience
            </Text>
          </View>

          <Text style={styles.fieldLabel}>Audience</Text>
          {NEWSLETTER_AUDIENCES.map((audience) => {
            const active = newsletterAudience === audience.id;
            const count = filterVolunteerContacts(volunteerContacts, audience.id).length;
            return (
              <Pressable
                key={audience.id}
                style={[styles.audienceOption, active && styles.audienceOptionActive]}
                onPress={() => setNewsletterAudience(audience.id)}>
                <View style={styles.audienceTextWrap}>
                  <Text style={[styles.audienceTitle, active && styles.audienceTitleActive]}>
                    {audience.label}
                  </Text>
                  <Text style={[styles.audienceHint, active && styles.audienceHintActive]}>
                    {audience.hint}
                  </Text>
                </View>
                <View style={[styles.audienceCount, active && styles.audienceCountActive]}>
                  <Text style={[styles.audienceCountText, active && styles.audienceCountTextActive]}>
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          <Text style={styles.fieldLabel}>Subject</Text>
          <TextInput
            style={styles.input}
            placeholder="Newsletter subject"
            placeholderTextColor={Colors.textMuted}
            value={newsletterSubject}
            onChangeText={setNewsletterSubject}
          />

          <Text style={styles.fieldLabel}>Message</Text>
          <TextInput
            style={[styles.input, styles.textArea, styles.newsletterMessage]}
            placeholder="Write your update to volunteers…"
            placeholderTextColor={Colors.textMuted}
            value={newsletterMessage}
            onChangeText={setNewsletterMessage}
            multiline
          />

          <Pressable
            style={[
              styles.publishButton,
              (sendingNewsletter || newsletterRecipientCount === 0) && styles.forwardButtonDisabled,
            ]}
            onPress={sendVolunteerNewsletter}
            disabled={sendingNewsletter || newsletterRecipientCount === 0}>
            {sendingNewsletter ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color={Colors.white} />
                <Text style={styles.publishButtonText}>
                  Send mail to {newsletterRecipientCount} volunteer
                  {newsletterRecipientCount === 1 ? '' : 's'}
                </Text>
              </>
            )}
          </Pressable>

          <Text style={styles.helperText}>
            Your device mail app opens with BCC recipients so volunteer emails stay private.
          </Text>

          {volunteerContacts.length > 0 ? (
            <>
              <Text style={styles.sectionHeading}>Volunteer list</Text>
              {volunteerContacts.slice(0, 40).map((contact) => (
                <View key={contact.email} style={styles.volunteerRow}>
                  <View style={styles.volunteerAvatar}>
                    <Text style={styles.volunteerAvatarText}>
                      {(contact.full_name || 'V').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.volunteerText}>
                    <Text style={styles.volunteerName}>{contact.full_name || 'Volunteer'}</Text>
                    <Text style={styles.volunteerEmail}>{contact.email}</Text>
                  </View>
                </View>
              ))}
              {volunteerContacts.length > 40 ? (
                <Text style={styles.helperText}>
                  Showing first 40 of {volunteerContacts.length} volunteers.
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.empty}>No volunteers have signed up yet.</Text>
          )}
        </KeyboardAwareScrollView>
      ) : section === 'events' ? (
        <KeyboardAwareScrollView
          contentContainerStyle={styles.form}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          keyboardShouldPersistTaps="handled">
          <Pressable
            style={styles.createEventToggle}
            onPress={() => {
              if (showCreateEvent) {
                resetEventForm();
                return;
              }
              resetEventForm();
              setShowCreateEvent(true);
            }}>
            <Ionicons name={showCreateEvent ? 'remove-circle-outline' : 'add-circle-outline'} size={20} color={Colors.primary} />
            <Text style={styles.createEventToggleText}>
              {showCreateEvent
                ? editingEventId
                  ? 'Cancel editing'
                  : 'Hide create form'
                : 'Create new event'}
            </Text>
          </Pressable>

          {showCreateEvent ? (
            <View style={styles.createEventCard}>
              <View style={styles.infoBanner}>
                <Ionicons
                  name={editingEventId ? 'create-outline' : 'notifications'}
                  size={18}
                  color={Colors.primary}
                />
                <Text style={styles.infoBannerText}>
                  {editingEventId
                    ? 'Update the event details below. Changes appear immediately for everyone.'
                    : 'Publishing sends a push alert to volunteers with Event updates on.'}
                </Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Event title"
                placeholderTextColor={Colors.textMuted}
                value={eventTitle}
                onChangeText={setEventTitle}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                placeholderTextColor={Colors.textMuted}
                value={eventDescription}
                onChangeText={setEventDescription}
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="Category (e.g. Cleanup)"
                placeholderTextColor={Colors.textMuted}
                value={eventCategory}
                onChangeText={setEventCategory}
              />
              <TextInput
                style={styles.input}
                placeholder="Location"
                placeholderTextColor={Colors.textMuted}
                value={eventLocation}
                onChangeText={setEventLocation}
              />
              <Text style={styles.fieldLabel}>Event photo</Text>
              {eventPhotoUri || eventExistingImageUrl ? (
                <View style={styles.eventPhotoPreviewWrap}>
                  <Image
                    source={{ uri: eventPhotoUri ?? eventExistingImageUrl ?? undefined }}
                    style={styles.eventPhotoPreview}
                  />
                  <View style={styles.eventPhotoActions}>
                    <Pressable style={styles.eventPhotoActionButton} onPress={pickEventPhoto}>
                      <Ionicons name="image-outline" size={16} color={Colors.primary} />
                      <Text style={styles.eventPhotoActionText}>Change photo</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.eventPhotoActionButton, styles.eventPhotoRemoveButton]}
                      onPress={() => {
                        setEventPhotoUri(null);
                        setEventExistingImageUrl(null);
                        setRemoveEventPhoto(true);
                      }}>
                      <Ionicons name="trash-outline" size={16} color={Colors.red} />
                      <Text style={styles.eventPhotoRemoveText}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable style={styles.eventPhotoButton} onPress={pickEventPhoto}>
                  <Ionicons name="camera-outline" size={22} color={Colors.primary} />
                  <View style={styles.eventPhotoButtonTextWrap}>
                    <Text style={styles.eventPhotoButtonText}>Upload event photo</Text>
                    <Text style={styles.eventPhotoButtonHint}>Optional cover image shown on the Events tab</Text>
                  </View>
                </Pressable>
              )}
              <Text style={styles.fieldLabel}>When</Text>
              <EventDateTimePicker value={eventStartsAt} onChange={setEventStartsAt} />
              <Pressable style={styles.publishButton} onPress={saveEvent} disabled={creatingEvent}>
                {creatingEvent ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Ionicons
                      name={editingEventId ? 'save-outline' : 'megaphone-outline'}
                      size={18}
                      color={Colors.white}
                    />
                    <Text style={styles.publishButtonText}>
                      {editingEventId ? 'Save changes' : 'Publish event'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.sectionHeading}>Upcoming events</Text>
          {events.length === 0 ? (
            <Text style={styles.empty}>No events yet. Create one above.</Text>
          ) : (
            events.map((event) => {
              const { date, month, time } = formatEventDateParts(event.starts_at);
              return (
                <View key={event.id} style={styles.card}>
                  <Pressable onPress={() => router.push(`/event/${event.id}`)}>
                    <Text style={styles.cardTitle}>{event.title}</Text>
                    <Text style={styles.cardMeta}>
                      {date} {month} · {time} · {event.location_label}
                    </Text>
                    {event.description ? (
                      <Text style={styles.cardBody} numberOfLines={3}>
                        {event.description}
                      </Text>
                    ) : null}
                    <Text style={styles.cardMeta}>{event.attendee_count} RSVPs · {event.category}</Text>
                    <View style={styles.viewEventRow}>
                      <Text style={styles.viewEventText}>View full details</Text>
                      <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                    </View>
                  </Pressable>
                  <View style={styles.eventAdminActions}>
                    <Pressable style={styles.editEventButton} onPress={() => startEditEvent(event)}>
                      <Ionicons name="create-outline" size={16} color={Colors.primary} />
                      <Text style={styles.editEventButtonText}>Edit event</Text>
                    </Pressable>
                    <Pressable
                      style={styles.deleteEventButton}
                      onPress={() => deleteEvent(event)}
                      disabled={deletingEventId === event.id}>
                      {deletingEventId === event.id ? (
                        <ActivityIndicator color={Colors.red} size="small" />
                      ) : (
                        <>
                          <Ionicons name="trash-outline" size={16} color={Colors.red} />
                          <Text style={styles.deleteEventButtonText}>Delete event</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </KeyboardAwareScrollView>
      ) : section === 'chalkboard' ? (
        <KeyboardAwareScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }>
          <Text style={styles.sectionHint}>
            Citizen notes sync to every phone and auto-erase after {STICKY_NOTE_TTL_DAYS} days. Pin a
            note to keep it on the town chalkboard until you unpin or erase it.
          </Text>
          {stickyNotes.length === 0 ? (
            <Text style={styles.empty}>No chalkboard notes right now.</Text>
          ) : (
            stickyNotes.map((note) => (
              <View key={note.id} style={styles.card}>
                <View style={styles.noteCardHeader}>
                  <Text style={[styles.cardTitle, { flex: 1 }]} numberOfLines={3}>
                    {note.body}
                  </Text>
                  {note.pinned ? (
                    <View style={styles.pinnedChip}>
                      <Ionicons name="pin" size={12} color={Colors.orange} />
                      <Text style={styles.pinnedChipText}>Pinned</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.cardMeta}>
                  {note.author_name} · {new Date(note.created_at).toLocaleString()}
                  {note.pinned
                    ? ' · stays until you remove it'
                    : (() => {
                        const left = formatStickyNoteRemaining(note);
                        return left ? ` · ${left}` : '';
                      })()}
                </Text>
                <View style={styles.noteActions}>
                  <Pressable
                    style={[styles.secondaryButton, note.pinned && styles.secondaryButtonActive]}
                    onPress={() => toggleStickyPin(note)}
                    disabled={pinningNoteId === note.id}>
                    {pinningNoteId === note.id ? (
                      <ActivityIndicator color={Colors.primary} size="small" />
                    ) : (
                      <Text style={styles.secondaryButtonText}>
                        {note.pinned ? 'Unpin' : 'Pin to stay'}
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={styles.dangerButton}
                    onPress={() => eraseStickyNote(note)}
                    disabled={deletingNoteId === note.id}>
                    {deletingNoteId === note.id ? (
                      <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                      <Text style={styles.dangerButtonText}>Erase</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </KeyboardAwareScrollView>
      ) : section === 'emergencies' ? (
        <KeyboardAwareScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }>
          {emergencies.length === 0 ? (
            <Text style={styles.empty}>No active emergency alerts.</Text>
          ) : (
            emergencies.map((alert) => (
              <View key={alert.id} style={[styles.card, styles.emergencyCard]}>
                <Text style={styles.cardTitle}>{alert.citizen_name}</Text>
                <Text style={styles.cardMeta}>
                  {alert.status === 'responding' && alert.responded_by_name
                    ? `${alert.responded_by_name} is responding`
                    : 'Needs volunteer response'}
                </Text>
                {alert.message ? <Text style={styles.cardBody}>{alert.message}</Text> : null}
                <Text style={styles.cardLocation}>{alert.location_label}</Text>
                <Text style={styles.cardCoords}>
                  {formatCoords(alert.latitude, alert.longitude)}
                </Text>
                <View style={styles.emergencyActions}>
                  <Pressable
                    style={styles.mapLinkButton}
                    onPress={() => Linking.openURL(mapsUrl(alert.latitude, alert.longitude))}>
                    <Text style={styles.mapLinkButtonText}>Open map</Text>
                  </Pressable>
                  <Pressable
                    style={styles.resolveEmergencyButton}
                    onPress={() => resolveEmergency(alert.id)}>
                    <Text style={styles.resolveEmergencyButtonText}>Resolve</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </KeyboardAwareScrollView>
      ) : (
        <KeyboardAwareScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }>
          {reports.length === 0 ? (
            <Text style={styles.empty}>No reports submitted yet.</Text>
          ) : (
            reports.map((report) => {
              const definition = resolveDepartmentDefinition(report.category);
              const route = resolveRouteForCategory(report.category, contactDrafts);
              const severity = reportSeverityMeta(report.severity);
              return (
              <View key={report.id} style={styles.card}>
                <Text style={styles.cardTitle}>{report.title}</Text>
                <Text style={styles.cardMeta}>
                  {report.author_name ?? report.reporter_name ?? 'Citizen'} · {report.category}
                </Text>
                <View style={[styles.severityBadge, { backgroundColor: severity.softColor }]}>
                  <Text style={[styles.severityBadgeText, { color: severity.color }]}>
                    {severity.label} severity
                  </Text>
                </View>
                {report.description ? <Text style={styles.cardBody}>{report.description}</Text> : null}
                {report.location_label ? (
                  <Text style={styles.cardLocation}>{report.location_label}</Text>
                ) : null}
                {report.latitude != null && report.longitude != null ? (
                  <Pressable onPress={() => Linking.openURL(mapsUrl(report.latitude!, report.longitude!))}>
                    <Text style={styles.cardCoords}>{formatCoords(report.latitude, report.longitude)}</Text>
                  </Pressable>
                ) : null}
                {report.photo_url ? (
                  <Image source={{ uri: report.photo_url }} style={styles.reportPhoto} />
                ) : null}
                {report.forwarded_at ? (
                  <Text style={styles.forwardedBadge}>
                    Sent to {report.forwarded_to} · {new Date(report.forwarded_at).toLocaleString()}
                  </Text>
                ) : null}
                <Text style={styles.emailLabel}>Send to {definition.name}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter authority email"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={contactDrafts[definition.id] ?? ''}
                  onChangeText={(value) => updateContactDraft(definition.id, value)}
                />
                <Pressable
                  style={[
                    styles.forwardButton,
                    !isValidEmail(route.email) && styles.forwardButtonDisabled,
                  ]}
                  onPress={() => sendReportToDepartment(report)}
                  disabled={forwardingId === report.id || !isValidEmail(route.email)}>
                  {forwardingId === report.id ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <>
                      <Ionicons name="mail-outline" size={16} color={Colors.white} />
                      <Text style={styles.forwardButtonText}>Send report to authority</Text>
                    </>
                  )}
                </Pressable>
                <View style={styles.statusRow}>
                  {statusOptions.map((status) => (
                    <Pressable
                      key={status}
                      style={[styles.statusChip, report.status === status && styles.statusChipActive]}
                      onPress={() => updateStatus(report.id, status)}>
                      <Text
                        style={[
                          styles.statusText,
                          report.status === status && styles.statusTextActive,
                        ]}>
                        {status.replace('_', ' ')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  style={styles.deleteReportButton}
                  onPress={() => deleteReport(report)}
                  disabled={deletingReportId === report.id}>
                  {deletingReportId === report.id ? (
                    <ActivityIndicator color={Colors.red} size="small" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={16} color={Colors.red} />
                      <Text style={styles.deleteReportButtonText}>Delete spam report</Text>
                    </>
                  )}
                </Pressable>
              </View>
            );
            })
          )}
        </KeyboardAwareScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  localModeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.orangeLight,
    borderWidth: 1,
    borderColor: '#F0C9A8',
  },
  localModeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.text,
    fontWeight: '600',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.greenLight,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 18,
  },
  signOutButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  signOut: {
    color: Colors.red,
    fontWeight: '700',
    fontSize: 13,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  menuButton: {
    flexBasis: '48%',
    flexGrow: 1,
    maxWidth: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  menuButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.greenLight,
  },
  menuIconWrapActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  menuTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  menuLabelActive: {
    color: Colors.white,
  },
  menuSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 14,
  },
  menuSubtitleActive: {
    color: 'rgba(255,255,255,0.78)',
  },
  menuBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.greenLight,
  },
  menuBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  menuBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  menuBadgeTextActive: {
    color: Colors.white,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  createEventToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.greenLight,
  },
  createEventToggleText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  createEventCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
  },
  deleteEventButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: '#F5C6C0',
    backgroundColor: Colors.redLight,
  },
  deleteEventButtonText: {
    color: Colors.red,
    fontWeight: '700',
    fontSize: 14,
  },
  eventAdminActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  editEventButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.greenLight,
  },
  editEventButtonText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  viewEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  viewEventText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  form: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.greenLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.primary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  fieldLabel: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  newsletterStatCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  newsletterStatValue: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.primary,
  },
  newsletterStatLabel: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  newsletterStatHint: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  audienceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  audienceOptionActive: {
    backgroundColor: Colors.greenLight,
    borderColor: Colors.primary,
  },
  audienceTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  audienceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  audienceTitleActive: {
    color: Colors.primary,
  },
  audienceHint: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textMuted,
  },
  audienceHintActive: {
    color: Colors.primaryLight,
  },
  audienceCount: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
  },
  audienceCountActive: {
    backgroundColor: Colors.primary,
  },
  audienceCountText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  audienceCountTextActive: {
    color: Colors.white,
  },
  newsletterMessage: {
    minHeight: 140,
  },
  volunteerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  volunteerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.greenLight,
  },
  volunteerAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  volunteerText: {
    flex: 1,
    minWidth: 0,
  },
  volunteerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  volunteerEmail: {
    marginTop: 1,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  volunteerMeta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  volunteerBio: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textMuted,
  },
  skillSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  skillSelectText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  skillSelectPlaceholder: {
    color: Colors.textMuted,
    fontWeight: '500',
  },
  clearSkill: {
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
  },
  clearSkillText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.orange,
  },
  skillResultCount: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  eventPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.greenLight,
    borderWidth: 1,
    borderColor: '#D4E2E2',
  },
  eventPhotoButtonTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  eventPhotoButtonText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  eventPhotoButtonHint: {
    marginTop: 2,
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  eventPhotoPreviewWrap: {
    gap: Spacing.sm,
  },
  eventPhotoPreview: {
    width: '100%',
    height: 180,
    borderRadius: Radius.lg,
    backgroundColor: Colors.card,
  },
  eventPhotoActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  eventPhotoActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eventPhotoActionText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  eventPhotoRemoveButton: {
    borderColor: '#F5C6C0',
    backgroundColor: Colors.redLight,
  },
  eventPhotoRemoveText: {
    color: Colors.red,
    fontWeight: '700',
    fontSize: 13,
  },
  publishButton: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  publishButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  empty: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: Spacing.xl,
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  noteCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  pinnedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF4E8',
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pinnedChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.orange,
  },
  noteActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  secondaryButtonActive: {
    backgroundColor: '#EEF6F4',
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  dangerButton: {
    borderRadius: Radius.pill,
    backgroundColor: Colors.red,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 84,
  },
  dangerButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textMuted,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  severityBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardBody: {
    marginTop: Spacing.sm,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  cardLocation: {
    marginTop: Spacing.sm,
    fontSize: 13,
    color: Colors.primary,
  },
  cardCoords: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  reportPhoto: {
    marginTop: Spacing.sm,
    width: '100%',
    height: 160,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
  },
  forwardedBadge: {
    marginTop: Spacing.sm,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.orange,
  },
  forwardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  forwardButtonDisabled: {
    opacity: 0.45,
  },
  forwardButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
    flexShrink: 1,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  statusChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusChipActive: {
    backgroundColor: Colors.greenLight,
    borderColor: Colors.primary,
  },
  statusText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  statusTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  deleteReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: '#F5C6C0',
    backgroundColor: Colors.redLight,
  },
  deleteReportButtonText: {
    color: Colors.red,
    fontWeight: '700',
    fontSize: 14,
  },
  emergencyCard: {
    borderWidth: 1,
    borderColor: '#F5C6C0',
    backgroundColor: Colors.redLight,
  },
  emergencyActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  mapLinkButton: {
    flex: 1,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 10,
    alignItems: 'center',
  },
  mapLinkButtonText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  resolveEmergencyButton: {
    flex: 1,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    alignItems: 'center',
  },
  resolveEmergencyButtonText: {
    color: Colors.white,
    fontWeight: '700',
  },
  authorityCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  authorityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  authorityHint: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  saveContactButton: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveContactButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  emailLabel: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
