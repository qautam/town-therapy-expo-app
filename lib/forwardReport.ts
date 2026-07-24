import * as MailComposer from 'expo-mail-composer';
import { Alert, Linking, Platform } from 'react-native';

import { brand } from '@/constants/data';
import { isValidEmail, type DepartmentRoute } from '@/constants/departments';
import { formatCoords, mapsUrl } from '@/lib/location';
import type { Report } from '@/types/database';

function buildReportEmailBody(report: Report, departmentName: string) {
  const reporter = report.author_name ?? report.reporter_name ?? 'Citizen';
  const lines = [
    `Forwarded by ${brand.name} Admin`,
    `Department: ${departmentName}`,
    '',
    `Report ID: ${report.id}`,
    `Category: ${report.category}`,
    `Status: ${report.status.replace('_', ' ')}`,
    `Submitted: ${new Date(report.created_at).toLocaleString()}`,
    `Reporter: ${reporter}`,
    '',
    `Title: ${report.title}`,
    report.description ? `Description:\n${report.description}` : '',
    '',
    report.location_label ? `Location: ${report.location_label}` : '',
    report.latitude != null && report.longitude != null
      ? `Coordinates: ${formatCoords(report.latitude, report.longitude)}`
      : '',
    report.latitude != null && report.longitude != null
      ? `Map: ${mapsUrl(report.latitude, report.longitude)}`
      : '',
    report.photo_url ? `Photo evidence: ${report.photo_url}` : 'Photo evidence: none attached',
    '',
    '—',
    `${brand.name} · ${brand.motto}`,
    brand.location,
  ].filter(Boolean);

  return lines.join('\n');
}

function buildMailtoUrl(report: Report, to: string, departmentName: string) {
  const subject = encodeURIComponent(`[${brand.name}] ${report.category}: ${report.title}`);
  const body = encodeURIComponent(buildReportEmailBody(report, departmentName));
  return `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`;
}

function attachmentUri(photoUrl: string | null) {
  if (!photoUrl) return undefined;
  if (photoUrl.startsWith('file://') || photoUrl.startsWith('content://')) {
    return photoUrl;
  }
  return undefined;
}

export async function forwardReportToDepartment(
  report: Report,
  route: DepartmentRoute
): Promise<boolean> {
  if (!isValidEmail(route.email)) {
    throw new Error('Enter a valid authority email before sending.');
  }

  const subject = `[${brand.name}] ${report.category}: ${report.title}`;
  const body = buildReportEmailBody(report, route.department);
  const attachment = attachmentUri(report.photo_url);

  if (Platform.OS === 'web') {
    await Linking.openURL(buildMailtoUrl(report, route.email, route.department));
    return true;
  }

  const available = await MailComposer.isAvailableAsync();
  if (available) {
    const result = await MailComposer.composeAsync({
      recipients: [route.email],
      subject,
      body,
      attachments: attachment ? [attachment] : undefined,
    });
    return result.status === MailComposer.MailComposerStatus.SENT;
  }

  await Linking.openURL(buildMailtoUrl(report, route.email, route.department));
  return true;
}

export function confirmForwardReport(
  report: Report,
  route: DepartmentRoute,
  onConfirm: () => void
) {
  if (!isValidEmail(route.email)) {
    Alert.alert('Email required', 'Enter the authority email address before sending this report.');
    return;
  }

  Alert.alert(
    'Send to authority?',
    `Forward this report to ${route.department} at ${route.email}. Location and photo details will be included.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send email', onPress: onConfirm },
    ]
  );
}
