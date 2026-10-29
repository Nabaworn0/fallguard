import * as Speech from "expo-speech";

// Spoken prompts. Android's text-to-speech engine starts slowly and on Expo SDK 58 a
// speak() sent before it is ready can be dropped, so we warm it up at app start, pick an
// English voice the phone actually has, and retry once if speaking fails.

let voiceId: string | undefined;
let voiceCount = -1; // -1 = not checked yet
let lastError = "";
let ready: Promise<void> | null = null;

/** Starts the TTS engine and picks an English voice. Safe to call many times. */
export function initVoice() {
  if (!ready) {
    ready = Speech.getAvailableVoicesAsync()
      .then((voices) => {
        voiceCount = voices.length;
        const en = voices.filter((v) => v.language?.toLowerCase().startsWith("en"));
        const pick =
          en.find((v) => v.language.toLowerCase().replace("_", "-") === "en-us" && !/network/i.test(v.identifier)) ??
          en.find((v) => !/network/i.test(v.identifier)) ??
          en[0];
        voiceId = pick?.identifier;
      })
      .catch((e) => {
        lastError = e instanceof Error ? e.message : String(e);
      });
  }
  return ready;
}

type SayOptions = { onDone?: () => void };

/** Speaks English text once the engine is ready */
export function say(text: string, opts: SayOptions = {}) {
  const speak = (retry: boolean) =>
    Speech.speak(text, {
      language: "en-US",
      voice: voiceId,
      rate: 0.95,
      onDone: opts.onDone,
      onStopped: opts.onDone,
      onError: (e) => {
        lastError = e instanceof Error ? e.message : String(e);
        if (retry) setTimeout(() => speak(false), 500);
        else opts.onDone?.();
      },
    });
  initVoice().finally(() => speak(true));
}

export const stopVoice = () => Speech.stop();

/** Short status line for the Settings "Test voice" button */
export function voiceStatus() {
  if (voiceCount < 0 && !lastError) return "Voice engine is still starting...";
  const parts = [
    voiceCount >= 0 ? `${voiceCount} voices on this phone` : "Couldn't list voices",
    voiceId ? `using ${voiceId}` : "no English voice found, using default",
  ];
  if (lastError) parts.push(`last error: ${lastError}`);
  return parts.join(" · ");
}
