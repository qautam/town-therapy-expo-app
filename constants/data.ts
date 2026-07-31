import { Colors } from './theme';

export type Event = {
  id: string;
  title: string;
  description: string;
  date: string;
  month: string;
  time: string;
  location: string;
  category: string;
  image: string;
  attendees: number;
  isGoing?: boolean;
};

export type CommunityPost = {
  id: string;
  author: string;
  authorInitial: string;
  timestamp: string;
  category: 'Success' | 'Before/After' | 'Volunteer' | 'Local Hero';
  title: string;
  description: string;
  likes: number;
  featured?: boolean;
};

export type Badge = {
  id: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  locked?: boolean;
  /** Reddit-award style rarity ring */
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'coral';
  description?: string;
};

export const brand = {
  name: 'Town Therapy',
  tagline: 'Healing Hazaribagh',
  motto: 'RANT. REPORT. REFORM',
  headline: 'Ready to make the town better?',
  subheadline:
    'We fix what we can, and make the authorities sweat for what they should.',
  mission:
    'Turning our Town\'s mess into momentum — one cleanup, one report, one reform at a time.',
  location: 'Hazaribagh, Jharkhand, India',
  email: 'towntherapy71@gmail.com',
  website: 'https://towntherapy.club',
};

/** Demo volunteer identity used across local seed data and UI fallbacks. */
export const demoVolunteer = {
  name: 'Gautam',
  email: 'gautam@towntherapy.app',
};

export const user = {
  name: 'Town Admin',
  greeting: 'Town',
  email: 'admin@towntherapy.app',
  tagline: 'Keeping Hazaribagh moving forward.',
  role: 'Town Admin',
  stats: { hours: 46, events: 15, reports: 5 },
  interests: 'Governance',
  skills: 'Coordination',
  availability: 'Weekends',
  dashboard: { drives_completed: 3, issues_reported: 3, issues_resolved: 1 },
};

export const events: Event[] = [
  {
    id: '1',
    title: 'Riverside Cleanup Drive',
    description:
      'Join neighbors for a morning cleanup along the riverside. Gloves and bags provided.',
    date: '20',
    month: 'JUL',
    time: '07:30 AM',
    location: 'Riverside Park, Hazaribagh',
    category: 'Cleanup',
    image:
      'https://images.unsplash.com/photo-1559027615-cd4628903328?w=800&q=80',
    attendees: 1,
    isGoing: true,
  },
  {
    id: '2',
    title: 'Neighborhood Tree Planting',
    description:
      'Help plant native trees across Hazaribagh. No experience needed — tools provided.',
    date: '27',
    month: 'JUL',
    time: '09:00 AM',
    location: 'Oak Street, Hazaribagh',
    category: 'Tree Planting',
    image:
      'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80',
    attendees: 3,
    isGoing: false,
  },
];

export const communityPosts: CommunityPost[] = [
  {
    id: '1',
    author: 'Ravi Kumar',
    authorInitial: 'R',
    timestamp: 'Jul 17 · 5:06 PM',
    category: 'Before/After',
    title: 'The alley finally shines again!',
    description:
      'Before: trash piled up for weeks. After: clean, safe, and walkable thanks to our weekend crew.',
    likes: 0,
    featured: true,
  },
  {
    id: '2',
    author: 'Town Admin',
    authorInitial: 'T',
    timestamp: 'Jul 16 · 2:30 PM',
    category: 'Local Hero',
    title: 'Local hero: Ravi',
    description:
      'Ravi coordinated three neighbors to fix the broken bench near the playground.',
    likes: 2,
  },
  {
    id: '3',
    author: 'Priya Sharma',
    authorInitial: 'P',
    timestamp: 'Jul 15 · 11:00 AM',
    category: 'Success',
    title: 'Streetlight fixed in 48 hours!',
    description:
      'Reported a dark corner on Elm St. Authorities responded fast — now kids can walk home safely.',
    likes: 5,
  },
];

export const badges: Badge[] = [];

export const communityFilters = ['All', 'Success', 'Before/After', 'Volunteer', 'Local Hero'];

export const heroImage =
  'https://images.unsplash.com/photo-1559027615-cd4628903328?w=1200&q=80';
