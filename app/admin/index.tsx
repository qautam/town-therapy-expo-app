import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventDateTimePicker } from '@/components/EventDateTimePicker';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { DEPARTMENT_DEFINITIONS, isValidEmail, resolveDepartmentDefinition } from '@/constants/departments';
import { api, formatEventDateParts } from '@/lib/api';
import { buildContactDrafts, resolveRouteForCategory } from '@/lib/departmentContacts';
import { confirmForwardReport, forwardReportToDepartment } from '@/lib/forwardReport';
import { formatCoords, mapsUrl } from '@/lib/location';
import type { EmergencyAlert, Event, Report, UpdateEventInput } from '@/types/database';
import { Colors, Radius, Spacing } from '@/constants/theme';

const statusOptions: Report['status'][] = ['open', 'in_progress', 'resolved'];

type AdminSection = 'reports' | 'authorities' | 'events' | 'emergencies';

const ADMIN_TABS: {
  id: AdminSection;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'reports', label: 'Reports', subtitle: 'Citizen issues', icon: 'document-text-outline' },
  { id: 'authorities', label: 'Authorities', subtitle: 'Department emails', icon: 'mail-outline' },
  { id: 'events', label: 'Events', subtitle: 'Create & manage', icon: 'calendar-outline' },
  { id: 'emergencies', label: 'SOS Alerts', subtitle: 'Live emergencies', icon: 'warning-outline' },
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

  const loadEvents = useCallback(async () => {
    const data = await api.listEvents(null);
    setEvents(data);
  }, []);

  const loadDepartmentContacts = useCallback(async () => {
    const contacts = await api.listDepartmentContacts();
    setContactDrafts(buildContactDrafts(contacts));
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadReports(), loadEvents(), loadEmergencies(), loadDepartmentContacts()]);
  }, [loadReports, loadEvents, loadEmergencies, loadDepartmentContacts]);

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
      Alert.alert('Update failed', error instanceof Error ? error.message : 'Try again.');
    }
  };

  const deleteReport = (report: Report) => {
    Alert.alert(
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
              Alert.alert('Delete failed', error instanceof Error ? error.message : 'Try again.');
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
      Alert.alert('Invalid email', 'Enter a valid authority email address.');
      return;
    }

    setSavingContactId(departmentId);
    try {
      await api.saveDepartmentContact(departmentId, email);
      Alert.alert('Saved', 'Authority email updated.');
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Try again.');
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
        Alert.alert('Report forwarded', `Email sent to ${route.department}.`);
      } catch (error) {
        Alert.alert('Could not send', error instanceof Error ? error.message : 'Try again.');
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
      Alert.alert('Update failed', error instanceof Error ? error.message : 'Try again.');
    }
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
      Alert.alert('Missing details', 'Add an event title and location.');
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
        Alert.alert('Event updated', 'Your changes are now live for all volunteers.');
      } else {
        await api.createEvent(input);
        Alert.alert(
          'Event published',
          'Volunteers with event updates enabled will get a push notification on their device.'
        );
      }

      resetEventForm();
      await loadEvents();
    } catch (error) {
      Alert.alert(
        editingEventId ? 'Update failed' : 'Create failed',
        error instanceof Error ? error.message : 'Try again.'
      );
    } finally {
      setCreatingEvent(false);
    }
  };

  const pickEventPhoto = () => {
    Alert.alert('Add event photo', 'Upload a cover image for this event.', [
      {
        text: 'Take photo',
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('Camera access needed', 'Enable camera access to photograph the event.');
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
            Alert.alert('Photos access needed', 'Enable photo library access to attach an image.');
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
    Alert.alert('Delete event?', `Remove "${event.title}" from upcoming events?`, [
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
            Alert.alert('Delete failed', error instanceof Error ? error.message : 'Try again.');
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

      {section === 'authorities' ? (
        <ScrollView contentContainerStyle={styles.form}>
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
        </ScrollView>
      ) : section === 'events' ? (
        <ScrollView
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
        </ScrollView>
      ) : section === 'emergencies' ? (
        <ScrollView
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
        </ScrollView>
      ) : (
        <ScrollView
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
              return (
              <View key={report.id} style={styles.card}>
                <Text style={styles.cardTitle}>{report.title}</Text>
                <Text style={styles.cardMeta}>
                  {report.author_name ?? report.reporter_name ?? 'Citizen'} · {report.category}
                </Text>
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
        </ScrollView>
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
    color: Colors.text,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: Colors.textSecondary,
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
