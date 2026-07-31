import { Audio } from 'expo-av';
import { Platform } from 'react-native';

/**
 * Per-letter chalk scrapes from real chalk recordings (CC0):
 * - ChloePieterse https://freesound.org/s/763597/
 * - Anthousai https://freesound.org/s/398491/
 * Clips are ~95ms so each typed character gets its own soft stroke in sync.
 */

const STROKE_SOURCES = [
  require('../assets/sounds/chalk-write-1.wav'),
  require('../assets/sounds/chalk-write-2.wav'),
  require('../assets/sounds/chalk-write-3.wav'),
  require('../assets/sounds/chalk-write-4.wav'),
  require('../assets/sounds/chalk-write-5.wav'),
  require('../assets/sounds/chalk-write-6.wav'),
  require('../assets/sounds/chalk-write-7.wav'),
  require('../assets/sounds/chalk-write-8.wav'),
  require('../assets/sounds/chalk-write-9.wav'),
  require('../assets/sounds/chalk-write-10.wav'),
  require('../assets/sounds/chalk-write-11.wav'),
  require('../assets/sounds/chalk-write-12.wav'),
];

/** Quiet but clear enough to hear with each letter. */
const STROKE_VOLUME = Platform.OS === 'ios' ? 0.078 : 0.091;

let players: Audio.Sound[] = [];
let loadPromise: Promise<void> | null = null;
let cursor = 0;
let ready = false;

async function ensureLoaded() {
  if (ready && players.length) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const loaded: Audio.Sound[] = [];
      for (const source of STROKE_SOURCES) {
        const { sound } = await Audio.Sound.createAsync(source, {
          volume: STROKE_VOLUME,
          shouldPlay: false,
          isLooping: false,
          progressUpdateIntervalMillis: 500,
        });
        loaded.push(sound);
      }
      players = loaded;
      ready = true;
    } catch {
      ready = false;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/** Warm the pool before the first keystroke so letter 1 isn't delayed. */
export function preloadChalkSound() {
  void ensureLoaded();
}

/**
 * One soft chalk scrape per typed character.
 * Round-robins a pool so fast typing stays in sync (no waiting on the previous letter).
 */
export function playChalkScreech() {
  // Fire-and-forget — awaiting would lag behind the caret
  void (async () => {
    try {
      if (!ready) await ensureLoaded();
      if (!players.length) return;

      const player = players[cursor % players.length];
      cursor += 1;

      const volume = STROKE_VOLUME * (0.85 + Math.random() * 0.3);
      const rate = 0.96 + Math.random() * 0.1;

      // Replay from start immediately — each letter = one short stroke
      await player.setStatusAsync({
        positionMillis: 0,
        volume,
        rate,
        shouldCorrectPitch: true,
        shouldPlay: true,
      });
    } catch {
      // Audio is best-effort
    }
  })();
}

export async function unloadChalkSound() {
  ready = false;
  try {
    await Promise.all(players.map((sound) => sound.unloadAsync()));
  } catch {
    // ignore
  }
  players = [];
}
