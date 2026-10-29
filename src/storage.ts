import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_THRESHOLDS, Thresholds } from "./fallDetector";

export type Settings = {
  token: string;
  chatId: string;
  thresholds: Thresholds;
};

export type HistoryItem = {
  time: string;
  status: "SENT" | "CANCELLED" | "FAILED";
  maps?: string;
  note?: string;
};

// Built-in Telegram values from .env.local (EXPO_PUBLIC_ vars are inlined at build time)
export const DEFAULT_SETTINGS: Settings = {
  token: process.env.EXPO_PUBLIC_TELEGRAM_TOKEN ?? "",
  chatId: process.env.EXPO_PUBLIC_TELEGRAM_CHAT_ID ?? "",
  thresholds: DEFAULT_THRESHOLDS,
};

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem("settings");
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      // Telegram values come only from .env.local, never from saved settings
      token: DEFAULT_SETTINGS.token,
      chatId: DEFAULT_SETTINGS.chatId,
      thresholds: { ...DEFAULT_THRESHOLDS, ...(parsed.thresholds ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: Settings) {
  await AsyncStorage.setItem("settings", JSON.stringify(s));
}

export async function loadHistory(): Promise<HistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem("history");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addHistory(item: HistoryItem): Promise<HistoryItem[]> {
  const list = [item, ...(await loadHistory())].slice(0, 50);
  await AsyncStorage.setItem("history", JSON.stringify(list));
  return list;
}

export async function clearHistory() {
  await AsyncStorage.removeItem("history");
}
