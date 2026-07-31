import * as MailComposer from 'expo-mail-composer';
import { Linking, Platform } from 'react-native';

import { brand } from '@/constants/data';
import { isValidEmail } from '@/constants/departments';
import { townAlert } from '@/context/TownAlertContext';

export type VolunteerMailContact = {
  email: string;
  full_name: string;
  event_updates: boolean;
  town_newsletter: boolean;
  guest_id?: string;
  bio?: string;
  cause?: string;
  skills?: string;
  availability?: string;
  events_attended?: number;
  hours_volunteered?: number;
  reports_flagged?: number;
};

export type VolunteerNewsletterAudience = 'all' | 'town_newsletter' | 'event_updates';

export function filterVolunteerContacts(
  contacts: VolunteerMailContact[],
  audience: VolunteerNewsletterAudience
) {
  return contacts.filter((contact) => {
    if (!isValidEmail(contact.email)) return false;
    if (audience === 'town_newsletter') return contact.town_newsletter;
    if (audience === 'event_updates') return contact.event_updates;
    return true;
  });
}

function buildNewsletterBody(message: string) {
  return [
    message.trim(),
    '',
    '—',
    `${brand.name} · ${brand.motto}`,
    brand.location,
  ].join('\n');
}

function buildMailtoBccUrl(emails: string[], subject: string, body: string) {
  const bcc = emails.map((email) => encodeURIComponent(email)).join(',');
  return `mailto:?bcc=${bcc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function composeVolunteerNewsletter(input: {
  contacts: VolunteerMailContact[];
  audience: VolunteerNewsletterAudience;
  subject: string;
  message: string;
}): Promise<boolean> {
  const recipients = filterVolunteerContacts(input.contacts, input.audience).map((c) =>
    c.email.trim().toLowerCase()
  );
  const unique = [...new Set(recipients)];

  if (unique.length === 0) {
    throw new Error('No volunteer emails match this audience yet.');
  }

  const subject = input.subject.trim() || `${brand.name} update`;
  const body = buildNewsletterBody(input.message || 'Hello from Town Therapy!');

  if (Platform.OS === 'web') {
    await Linking.openURL(buildMailtoBccUrl(unique, subject, body));
    return true;
  }

  const available = await MailComposer.isAvailableAsync();
  if (available) {
    const result = await MailComposer.composeAsync({
      subject,
      body,
      bccRecipients: unique,
    });
    return result.status === MailComposer.MailComposerStatus.SENT;
  }

  await Linking.openURL(buildMailtoBccUrl(unique, subject, body));
  return true;
}

export function confirmVolunteerNewsletter(
  count: number,
  audienceLabel: string,
  onConfirm: () => void
) {
  if (count <= 0) {
    townAlert('No recipients', 'No volunteer emails match this audience yet.');
    return;
  }

  townAlert(
    'Send newsletter?',
    `Open your email app with ${count} volunteer${count === 1 ? '' : 's'} (${audienceLabel}) in BCC. Review and send from there.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open mail', onPress: onConfirm },
    ]
  );
}
