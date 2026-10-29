import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { PRESETS, Sensitivity, sensitivityOf } from "./fallDetector";
import { Settings, saveSettings } from "./storage";
import { sendTelegram } from "./telegram";
import { C, ui } from "./ui";
import { say, voiceStatus } from "./voice";

type Props = {
  settings: Settings;
  onSaved: (s: Settings) => void;
};

const LEVELS: { key: Sensitivity; label: string; desc: string }[] = [
  { key: "LOW", label: "Low", desc: "Only hard falls. Fewer false alarms." },
  { key: "NORMAL", label: "Normal", desc: "Recommended for most people." },
  { key: "HIGH", label: "High", desc: "Also catches softer falls. More false alarms." },
];

export default function SettingsScreen({ settings, onSaved }: Props) {
  const [level, setLevel] = useState<Sensitivity>(sensitivityOf(settings.thresholds));
  const [msg, setMsg] = useState("");

  // Save right away when a level is picked, no Save button needed
  const pick = async (key: Sensitivity) => {
    setLevel(key);
    const s: Settings = { ...settings, thresholds: PRESETS[key] };
    await saveSettings(s);
    onSaved(s);
    setMsg(`Sensitivity set to ${key.toLowerCase()}.`);
  };

  const test = async () => {
    setMsg("Sending test message...");
    try {
      await sendTelegram(settings.token, settings.chatId, "FallGuard test message. Your alerts are set up correctly.");
      setMsg("Test message sent. Check Telegram.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const testVoice = () => {
    setMsg("Speaking...");
    say("This is FallGuard. The voice is working.", { onDone: () => setMsg(`Voice test done. ${voiceStatus()}`) });
    // Show the status even if the engine never calls back
    setTimeout(() => setMsg((m) => (m === "Speaking..." ? `No reply from the voice engine. ${voiceStatus()}` : m)), 6000);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: 48 }}>
      <Text style={ui.title}>Settings</Text>

      <View style={ui.card}>
        <Text style={{ fontWeight: "700", color: C.text }}>
          <Feather name="send" size={15} /> Telegram
        </Text>
        <Text style={ui.muted}>
          {settings.token && settings.chatId
            ? `Configured in code. Caregiver chat ID: ${settings.chatId}`
            : "Not configured. Set EXPO_PUBLIC_TELEGRAM_TOKEN and EXPO_PUBLIC_TELEGRAM_CHAT_ID in .env.local."}
        </Text>
      </View>

      <Text style={[ui.title, { fontSize: 18, marginTop: 24, marginBottom: 4 }]}>Fall detection sensitivity</Text>

      {LEVELS.map((l) => {
        const active = level === l.key;
        return (
          <TouchableOpacity
            key={l.key}
            onPress={() => pick(l.key)}
            style={[ui.card, { borderWidth: 2, borderColor: active ? C.green : "transparent", padding: 16 }]}
          >
            <Text style={{ fontSize: 20, fontWeight: "700", color: active ? C.green : C.text }}>
              <Feather name={active ? "check-circle" : "circle"} size={20} /> {l.label}
            </Text>
            <Text style={[ui.muted, { fontSize: 15, marginTop: 4 }]}>{l.desc}</Text>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity style={[ui.btn, ui.btnGrey, { marginTop: 24 }]} onPress={test}>
        <Feather name="send" size={20} color="#fff" />
        <Text style={ui.btnText}>Send Test Message</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[ui.btn, ui.btnYellow]} onPress={testVoice}>
        <Feather name="volume-2" size={20} color={C.text} />
        <Text style={[ui.btnText, { color: C.text }]}>Test voice</Text>
      </TouchableOpacity>

      {!!msg && (
        <View style={ui.card}>
          <Text>{msg}</Text>
        </View>
      )}
    </ScrollView>
  );
}
