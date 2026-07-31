import { Audio } from 'expo-av';
import { Platform } from 'react-native';

let sound: Audio.Sound | null = null;
let loadPromise: Promise<Audio.Sound | null> | null = null;
let lastPlayAt = 0;

async function ensureSound(): Promise<Audio.Sound | null> {
  if (sound) return sound;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const created = await Audio.Sound.createAsync(
        require('../assets/sounds/chalk-screech.wav'),
        {
          volume: Platform.OS === 'ios' ? 0.55 : 0.7,
          shouldPlay: false,
          isLooping: false,
        }
      );
      sound = created.sound;
      return sound;
    } catch {
      return null;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/** Short chalk scrape — throttled so rapid typing still sounds continuous, not clipped. */
export async function playChalkScreech() {
  const now = Date.now();
  if (now - lastPlayAt < 48) return;
  lastPlayAt = now;

  try {
    const player = await ensureSound();
    if (!player) return;
    await player.setPositionAsync(0);
    await player.playAsync();
  } catch {
    // Audio is best-effort (web / silent failures).
  }
}

export async function unloadChalkSound() {
  try {
    if (sound) {
      await sound.unloadAsync();
      sound = null;
    }
  } catch {
    sound = null;
  }
}
