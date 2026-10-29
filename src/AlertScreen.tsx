import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, Vibration, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import * as Battery from "expo-battery";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { say, stopVoice } from "./voice";
import EmergencyInfo, { ACK_BUTTONS } from "./EmergencyInfo";
import { PROFILE, intlPhone } from "./profile";
import { Settings, addHistory } from "./storage";
import { escapeHtml, mapsLink, sendTelegram, sendTelegramLocation } from "./telegram";
import { C, ui } from "./ui";

const COUNTDOWN_SECONDS = 10;

type Phase = "COUNTDOWN" | "SENDING" | "SENT" | "FAILED" | "CANCELLED";

type Coords = Location.LocationObjectCoords;

async function getCoords(): Promise<Coords | null> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") return null;

    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
    ]);
    if (pos) return pos.coords;
  } catch {
    // fall through to last known position
  }
  try {
    const last = await Location.getLastKnownPositionAsync();
    return last ? last.coords : null;
  } catch {
    return null;
  }
}

/** Street address for the caregiver, or null if it can't be looked up */
async function getAddress(c: Coords): Promise<string | null> {
  try {
    const [a] = await Location.reverseGeocodeAsync({ latitude: c.latitude, longitude: c.longitude });
    if (!a) return null;
    const parts = [a.name, a.street, a.district ?? a.subregion, a.city ?? a.region].filter(Boolean);
    return parts.length ? Array.from(new Set(parts)).join(", ") : null;
  } catch {
    return null;
  }
}

async function getBattery(): Promise<number | null> {
  try {
    const level = await Battery.getBatteryLevelAsync();
    return level >= 0 ? Math.round(level * 100) : null;
  } catch {
    return null;
  }
}

type MessageInfo = {
  demo: boolean;
  manual: boolean; // "Send alert now" pressed instead of the countdown running out
  peak: number;
  coords: Coords | null;
  address: string | null;
  battery: number | null;
};

/** Telegram message in HTML mode, laid out so the caregiver can read it at a glance */
function buildMessage(m: MessageInfo) {
  const now = new Date();
  const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const lines = [
    m.demo ? "🧪 <b>TEST ALERT</b> (simulated fall)" : "🚨 <b>FALL DETECTED</b>",
    `👤 <b>${escapeHtml(PROFILE.name)}</b>, ${PROFILE.age}`,
    `📱 <b>Their phone:</b> ${intlPhone(PROFILE.phone)}`,
    m.manual
      ? "<i>The user asked for help.</i>"
      : `<i>No response to "Are you OK?" for ${COUNTDOWN_SECONDS} seconds.</i>`,
    "",
    `🕐 <b>Time:</b> ${time}, ${date}`,
  ];
  if (!m.demo) lines.push(`💥 <b>Impact:</b> ${m.peak.toFixed(1)} g`);
  if (m.coords) {
    const acc = m.coords.accuracy ? ` (±${Math.round(m.coords.accuracy)} m)` : "";
    lines.push(`📍 <b>Location:</b> ${escapeHtml(m.address ?? "see map")}${acc}`);
    lines.push(`🗺 <a href="${mapsLink(m.coords.latitude, m.coords.longitude)}">Open in Google Maps</a>`);
  } else {
    lines.push("📍 <b>Location:</b> unavailable (GPS off or no permission)");
  }
  if (m.battery !== null) lines.push(`🔋 <b>Battery:</b> ${m.battery}%`);
  lines.push(
    "",
    "🩺 <b>Medical info</b>",
    `Blood type: ${PROFILE.bloodType}`,
    `Conditions: ${escapeHtml(PROFILE.conditions)}`,
    `Allergies: <b>${escapeHtml(PROFILE.allergies)}</b>`,
    `Medicine: ${escapeHtml(PROFILE.medications)}`,
    "",
    "<b>Tap a button below so they know help is coming.</b>"
  );
  return lines.join("\n");
}

type Props = {
  settings: Settings;
  onClose: () => void;
  demo?: boolean; // opened by "Simulate fall"
  peak?: number; // strongest impact just before the alert (g)
};

export default function AlertScreen({ settings, onClose, demo = false, peak = 0 }: Props) {
  const [phase, setPhase] = useState<Phase>("COUNTDOWN");
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);
  const [error, setError] = useState("");
  const sending = useRef(false);
  const manualRef = useRef(false); // remembered for "Try again"
  const alarm = useAudioPlayer(require("../assets/alarm.wav"));
  const [messageId, setMessageId] = useState<number | null>(null);

  const sendAlert = async (manual = false) => {
    if (sending.current) return;
    manualRef.current = manual;
    sending.current = true;
    setPhase("SENDING");
    const time = new Date().toLocaleString();
    let maps: string | undefined;
    try {
      const [coords, battery] = await Promise.all([getCoords(), getBattery()]);
      const address = coords ? await getAddress(coords) : null;
      maps = coords ? mapsLink(coords.latitude, coords.longitude) : undefined;
      const text = buildMessage({ demo, manual, peak, coords, address, battery });
      setMessageId(await sendTelegram(settings.token, settings.chatId, text, true, ACK_BUTTONS));
      if (coords) {
        // The pin is a bonus; the main message already has the map link
        await sendTelegramLocation(settings.token, settings.chatId, coords.latitude, coords.longitude).catch(() => {});
      }
      await addHistory({ time, status: "SENT", maps });
      setPhase("SENT");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      await addHistory({ time, status: "FAILED", maps, note: msg });
      setPhase("FAILED");
    }
  };

  // Countdown + alarm sound + strong vibration while waiting for the user to respond
  useEffect(() => {
    if (phase !== "COUNTDOWN") return;
    // Long buzz, short gap: feels much stronger than equal on/off
    Vibration.vibrate([0, 900, 200, 900, 200], true);
    // SDK 58 on Android won't play (or pauses) when audio focus is taken. The speech voice
    // takes focus too, so mix with it instead of asking for exclusive focus.
    let active = true;
    alarm.loop = true;
    alarm.volume = 1;
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "mixWithOthers" })
      .catch(() => {})
      .finally(() => {
        if (active) alarm.play();
      });
    // Ask out loud, with the alarm turned down so the words are clear
    const ask = () => {
      alarm.volume = 0.2;
      const restore = () => {
        alarm.volume = 1;
      };
      say("Are you OK? Tap I'm OK if you are fine.", { onDone: restore });
    };
    ask();
    const askAgain = setTimeout(ask, 5000);
    const id = setInterval(() => {
      setRemaining((r) => r - 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      // Restart the alarm if the system paused it or it wasn't loaded yet on the first play()
      if (!alarm.playing) alarm.play();
    }, 1000);
    return () => {
      active = false;
      clearInterval(id);
      clearTimeout(askAgain);
      stopVoice();
      Vibration.cancel();
      alarm.pause();
      alarm.volume = 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase === "COUNTDOWN" && remaining <= 0) sendAlert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, phase]);

  const imOk = async () => {
    sending.current = true;
    setPhase("CANCELLED");
    await addHistory({ time: new Date().toLocaleString(), status: "CANCELLED" });
    onClose();
  };

  if (phase === "COUNTDOWN") {
    return (
      <View style={[ui.screen, { backgroundColor: C.coral, justifyContent: "center" }]}>
        <Feather name="alert-triangle" size={56} color="#fff" style={{ alignSelf: "center", marginBottom: 8 }} />
        <Text style={{ color: "#fff", fontSize: 32, fontWeight: "800", textAlign: "center" }}>
          Are you OK?
        </Text>
        <Text style={{ color: "#fff", fontSize: 96, fontWeight: "800", textAlign: "center", marginVertical: 20 }}>
          {Math.max(remaining, 0)}
        </Text>
        <Text style={{ color: "#fff", opacity: 0.9, fontSize: 16, textAlign: "center", marginBottom: 24 }}>
          A fall was detected. An alert will be sent to your caregiver when the timer reaches 0.
        </Text>
        <TouchableOpacity style={[ui.btn, ui.btnGreen, { padding: 22 }]} onPress={imOk}>
          <Feather name="check-circle" size={26} color="#fff" />
          <Text style={[ui.btnText, { fontSize: 22 }]}>I'M OK</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[ui.btn, { backgroundColor: "#fff" }]} onPress={() => sendAlert(true)}>
          <Feather name="bell" size={20} color={C.coral} />
          <Text style={[ui.btnText, { color: C.coral }]}>Send alert now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // After sending, show emergency info for whoever finds the person
  if (phase === "SENT") {
    return <EmergencyInfo settings={settings} messageId={messageId} onClose={onClose} />;
  }

  return (
    <View style={[ui.screen, { justifyContent: "center", alignItems: "center" }]}>
      {phase === "SENDING" && (
        <>
          <ActivityIndicator size="large" color={C.green} />
          <Text style={[ui.title, { marginTop: 16 }]}>Sending alert...</Text>
          <Text style={ui.muted}>Getting your location and notifying your caregiver</Text>
        </>
      )}
      {phase === "FAILED" && (
        <>
          <Feather name="x-circle" size={72} color={C.impact} />
          <Text style={[ui.title, { color: C.impact, marginTop: 12 }]}>Alert failed</Text>
          <Text style={[ui.muted, { textAlign: "center" }]}>{error}</Text>
          <TouchableOpacity
            style={ui.btn}
            onPress={() => {
              sending.current = false;
              sendAlert(manualRef.current);
            }}
          >
            <Feather name="refresh-cw" size={20} color="#fff" />
            <Text style={ui.btnText}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[ui.btn, ui.btnYellow]} onPress={() => setPhase("SENT")}>
            <Feather name="heart" size={20} color={C.text} />
            <Text style={[ui.btnText, { color: C.text }]}>Show emergency info</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[ui.btn, ui.btnGrey]} onPress={onClose}>
            <Feather name="x" size={20} color="#fff" />
            <Text style={ui.btnText}>Close</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
