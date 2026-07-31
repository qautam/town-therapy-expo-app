import type { TownNewsItem, TownNewsSnapshot } from '@/types/database';

export function weekAgoIso() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString();
}

export const DEMO_TOWN_NEWS: TownNewsSnapshot = {
  active_volunteers: 12,
  issues_this_week: 2,
  drives_completed: 3,
  issues_resolved: 1,
  next_event: {
    id: '1',
    title: 'Riverside Cleanup Drive',
    starts_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  community_hero: {
    name: 'Ravi Kumar',
    detail: 'Led the alley cleanup crew this week',
  },
};

function formatEventBannerDate(startsAt: string) {
  const date = new Date(startsAt);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${months[date.getMonth()]} ${date.getDate()} · ${hour12}:${minutes} ${ampm}`;
}

export function buildTownNewsItems(snapshot: TownNewsSnapshot): TownNewsItem[] {
  const items: TownNewsItem[] = [
    {
      id: 'volunteers',
      icon: 'people',
      text: `${snapshot.active_volunteers} active volunteers healing Hazaribagh right now`,
      route: '/newsletter',
    },
  ];

  if (snapshot.next_event) {
    items.push({
      id: 'next-event',
      icon: 'calendar',
      text: `Next event: ${snapshot.next_event.title} · ${formatEventBannerDate(snapshot.next_event.starts_at)}`,
      route: `/event/${snapshot.next_event.id}`,
    });
  }

  items.push({
    id: 'issues-week',
    icon: 'megaphone',
    text: `${snapshot.issues_this_week} issue${snapshot.issues_this_week === 1 ? '' : 's'} reported this week — spot one?`,
    route: '/report/new',
  });

  if (snapshot.community_hero) {
    items.push({
      id: 'hero',
      icon: 'star',
      text: `Community hero: ${snapshot.community_hero.name} — ${snapshot.community_hero.detail}`,
      route: '/(tabs)/profile',
    });
  }

  items.push(
    {
      id: 'drives',
      icon: 'checkmark-circle',
      text: `${snapshot.drives_completed} volunteer drive${snapshot.drives_completed === 1 ? '' : 's'} completed town-wide`,
      route: '/(tabs)/events',
    },
    {
      id: 'resolved',
      icon: 'ribbon',
      text: `${snapshot.issues_resolved} civic issue${snapshot.issues_resolved === 1 ? '' : 's'} resolved by the town`,
      route: '/(tabs)/reports',
    }
  );

  return items;
}
