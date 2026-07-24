import type { Ionicons } from '@expo/vector-icons';

export type EmergencyContact = {
  id: string;
  number: string;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  primary?: boolean;
};

/** Standard India emergency & helpline numbers (valid nationwide, including Jharkhand). */
export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: '112',
    number: '112',
    label: 'Emergency (All Services)',
    subtitle: 'Pan-India ERSS — police, fire, ambulance',
    icon: 'call',
    primary: true,
  },
  {
    id: '100',
    number: '100',
    label: 'Police',
    subtitle: 'Crime, theft, public order',
    icon: 'shield-checkmark',
  },
  {
    id: '101',
    number: '101',
    label: 'Fire Department',
    subtitle: 'Fire, rescue, hazardous incidents',
    icon: 'flame',
  },
  {
    id: '102',
    number: '102',
    label: 'Ambulance',
    subtitle: 'Medical emergencies',
    icon: 'medkit',
  },
  {
    id: '108',
    number: '108',
    label: 'Emergency Ambulance',
    subtitle: 'Free ambulance — Jharkhand & many states',
    icon: 'heart',
  },
  {
    id: '181',
    number: '181',
    label: 'Women Helpline',
    subtitle: '24×7 support for women in distress',
    icon: 'woman',
  },
];
