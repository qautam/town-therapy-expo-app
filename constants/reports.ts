import type { Ionicons } from '@expo/vector-icons';

export type ReportCategory = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
};

export const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: 'waste',
    label: 'Waste Management',
    icon: 'trash-outline',
    placeholder: 'Overflowing bin, illegal dumping, missed pickup…',
  },
  {
    id: 'traffic',
    label: 'Traffic',
    icon: 'car-outline',
    placeholder: 'Congestion, signal fault, unsafe crossing…',
  },
  {
    id: 'potholes',
    label: 'Potholes',
    icon: 'construct-outline',
    placeholder: 'Damaged road, broken pavement, waterlogging…',
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
];
