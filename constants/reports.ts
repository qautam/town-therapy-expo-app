import type { Ionicons } from '@expo/vector-icons';

export type ReportCategory = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
};

export type ReportSeverity = 'minor' | 'moderate' | 'critical';

export type ReportSeverityOption = {
  id: ReportSeverity;
  label: string;
  color: string;
  softColor: string;
};

export const REPORT_SEVERITIES: ReportSeverityOption[] = [
  { id: 'minor', label: 'Minor', color: '#2F9E6B', softColor: '#E4F6ED' },
  { id: 'moderate', label: 'Moderate', color: '#D4A017', softColor: '#FDF6E3' },
  { id: 'critical', label: 'Critical', color: '#C0392B', softColor: '#FCEAE8' },
];

export function reportSeverityMeta(severity: string | null | undefined): ReportSeverityOption {
  return (
    REPORT_SEVERITIES.find((item) => item.id === severity) ?? REPORT_SEVERITIES[1]
  );
}

export const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: 'waste',
    label: 'Waste Management',
    icon: 'trash-outline',
    placeholder: 'Overflowing bin, illegal dumping, missed pickup…',
  },
  {
    id: 'traffic',
    label: 'Traffic & Parking',
    icon: 'car-outline',
    placeholder: 'Congestion, illegal parking, blocked road, wrong-side driving…',
  },
  {
    id: 'potholes',
    label: 'Road issues',
    icon: 'construct-outline',
    placeholder: 'Potholes, broken pavement, damaged road…',
  },
  {
    id: 'drainage',
    label: 'Waterlogging & Drainage',
    icon: 'water-outline',
    placeholder: 'Flooded street, clogged drain, overflowing manhole…',
  },
  {
    id: 'streetlights',
    label: 'Streetlights',
    icon: 'bulb-outline',
    placeholder: 'Light out, flickering, or new light needed…',
  },
  {
    id: 'governance',
    label: 'Governance',
    icon: 'business-outline',
    placeholder: 'Corruption, delays, public service gaps…',
  },
  {
    id: 'other',
    label: 'Other',
    icon: 'ellipsis-horizontal-circle-outline',
    placeholder: 'Anything that doesn’t fit the categories above…',
  },
];
