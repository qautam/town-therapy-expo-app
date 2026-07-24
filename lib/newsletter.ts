import AsyncStorage from '@react-native-async-storage/async-storage';

import type { NewsletterSubscription } from '@/types/database';

const NEWSLETTER_KEY = '@town_therapy_newsletter';

export async function getCachedNewsletter(): Promise<NewsletterSubscription | null> {
  const raw = await AsyncStorage.getItem(NEWSLETTER_KEY);
  return raw ? (JSON.parse(raw) as NewsletterSubscription) : null;
}

export async function setCachedNewsletter(subscription: NewsletterSubscription | null) {
  if (subscription) {
    await AsyncStorage.setItem(NEWSLETTER_KEY, JSON.stringify(subscription));
  } else {
    await AsyncStorage.removeItem(NEWSLETTER_KEY);
  }
}
