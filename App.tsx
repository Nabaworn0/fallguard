import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useFallDetection } from "./src/useFallDetection";
import { DEFAULT_SETTINGS, Settings, loadSettings } from "./src/storage";
import MonitorScreen from "./src/MonitorScreen";
import HistoryScreen from "./src/HistoryScreen";
import SettingsScreen from "./src/SettingsScreen";
import AlertScreen from "./src/AlertScreen";
import { Feather } from "@expo/vector-icons";
import { C } from "./src/ui";
import { initVoice } from "./src/voice";

type Tab = "monitor" | "history" | "settings";

const TABS: { key: Tab; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
  { key: "monitor", label: "Monitor", icon: "shield" },
  { key: "history", label: "History", icon: "clock" },
  { key: "settings", label: "Settings", icon: "settings" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("monitor");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    initVoice(); // start text-to-speech early so the first prompt isn't lost
    loadSettings().then((s) => {
      setSettings(s);
      setLoaded(true);
    });
  }, []);

  const [demo, setDemo] = useState(false);
  const [alertPeak, setAlertPeak] = useState(0);
  const peakRef = useRef(0);

  // Real fall from the detector: remember the impact for the Telegram message
  const triggerAlert = useCallback(() => {
    setDemo(false);
    setAlertPeak(peakRef.current);
    setAlertOpen(true);
  }, []);

  const simulateFall = () => {
    setDemo(true);
    setAlertOpen(true);
  };

  const { magnitude, samples, peak } = useFallDetection(
    monitoring && !alertOpen,
    settings.thresholds,
    triggerAlert
  );
  peakRef.current = peak;

  // Keep the screen on while monitoring
  useEffect(() => {
    if (!monitoring) return;
    activateKeepAwakeAsync("fallguard").catch(() => {});
    return () => {
      deactivateKeepAwake("fallguard").catch(() => {});
    };
  }, [monitoring]);

  // Warn if the app goes to the background while monitoring
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" && monitoring) setPaused(true);
    });
    return () => sub.remove();
  }, [monitoring]);

  const toggleMonitoring = async () => {
    if (!monitoring) {
      // Ask for location permission now, so no prompt appears during an emergency
      try {
        await Location.requestForegroundPermissionsAsync();
      } catch {
        // ignore
      }
      setPaused(false);
    }
    setMonitoring((m) => !m);
  };

  if (!loaded) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  if (alertOpen) {
    return (
      <>
        <StatusBar style="light" />
        <AlertScreen settings={settings} demo={demo} peak={alertPeak} onClose={() => setAlertOpen(false)} />
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        {tab === "monitor" && (
          <MonitorScreen
            monitoring={monitoring}
            onToggle={toggleMonitoring}
            magnitude={magnitude}
            samples={samples}
            peak={peak}
            thresholds={settings.thresholds}
            paused={paused}
            telegramReady={!!settings.token.trim() && !!settings.chatId.trim()}
            onDismissPaused={() => setPaused(false)}
            onSimulateFall={simulateFall}
          />
        )}
        {tab === "history" && <HistoryScreen />}
        {tab === "settings" && <SettingsScreen settings={settings} onSaved={setSettings} />}
      </View>

      <View style={{ flexDirection: "row", backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border }}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={{ flex: 1, paddingVertical: 10, alignItems: "center" }} onPress={() => setTab(t.key)}>
            <Feather name={t.icon} size={22} color={tab === t.key ? C.green : C.muted} />
            <Text style={{ fontWeight: tab === t.key ? "700" : "400", color: tab === t.key ? C.green : C.muted }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
