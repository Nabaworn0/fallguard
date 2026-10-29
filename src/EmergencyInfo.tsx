import React, { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { AMBULANCE_NUMBER, PROFILE, intlPhone, telLink } from "./profile";
import { Settings } from "./storage";
import { answerButton, getButtonPresses, sendTelegram } from "./telegram";
import { C, ui } from "./ui";
import { say, stopVoice } from "./voice";

export const ACK_BUTTONS = [
  { text: "✅ I'm on my way", data: "ack:way" },
  { text: "📞 I'll call them", data: "ack:call" },
];

type Response = { who: string; kind: "way" | "call"; time: string };

const BYSTANDER_LINE = "This person may have fallen. Emergency information is on the screen.";

type Props = {
  settings: Settings;
  messageId: number | null; // the alert message whose buttons we listen to
  onClose: () => void;
};

/** Shown after the alert is sent, so someone who finds the person sees what to do */
export default function EmergencyInfo({ settings, messageId, onClose }: Props) {
  const [responses, setResponses] = useState<Response[]>([]);
  const [helping, setHelping] = useState(false);

  // Speak to anyone nearby, then repeat every 20 seconds
  useEffect(() => {
    say(BYSTANDER_LINE);
    const id = setInterval(() => say(BYSTANDER_LINE), 20000);
    return () => {
      clearInterval(id);
      stopVoice();
    };
  }, []);

  // Listen for the family tapping a button on the Telegram alert
  useEffect(() => {
    if (!messageId) return;
    const ctrl = new AbortController();
    let stopped = false;
    let offset = 0;

    (async () => {
      while (!stopped) {
        try {
          const presses = await getButtonPresses(settings.token, offset, 25, ctrl.signal);
          for (const p of presses) {
            offset = p.updateId + 1;
            if (p.messageId !== messageId || !p.queryId) continue;
            const kind = p.data === "ack:way" ? "way" : p.data === "ack:call" ? "call" : null;
            if (!kind) continue;
            const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
            setResponses((r) => [...r, { who: p.from, kind, time }]);
            say(kind === "way" ? `${p.from} is on the way.` : `${p.from} will call this phone.`);
            answerButton(settings.token, p.queryId, "Thanks! They can see your reply on the phone.").catch(() => {});
            // Let everyone else in the chat know someone has it covered
            sendTelegram(
              settings.token,
              settings.chatId,
              kind === "way"
                ? `✅ ${p.from} is on the way (${time})`
                : `📞 ${p.from} will call them (${time})\nTap to call: ${intlPhone(PROFILE.phone)}`,
              false,
              undefined,
              messageId
            ).catch(() => {});
          }
        } catch {
          if (stopped) break;
          await new Promise((r) => setTimeout(r, 3000)); // network hiccup, try again
        }
      }
    })();

    return () => {
      stopped = true;
      ctrl.abort();
    };
  }, [messageId, settings.token, settings.chatId]);

  const imHelping = async () => {
    if (helping) return;
    setHelping(true);
    say("Thank you for helping. The family has been told.");
    const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    sendTelegram(
      settings.token,
      settings.chatId,
      `👋 <b>Someone nearby is with ${PROFILE.name} now.</b>\nThey tapped "I'm here to help" on the phone at ${time}.`,
      true,
      undefined,
      messageId ?? undefined
    ).catch(() => {});
  };

  const latest = responses[responses.length - 1];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: 48, paddingBottom: 32 }}>
      <View style={{ backgroundColor: C.coral, borderRadius: 20, padding: 18, alignItems: "center" }}>
        <Feather name="alert-triangle" size={40} color="#fff" />
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", marginTop: 6 }}>I may have fallen</Text>
        <Text style={{ color: "#fff", fontSize: 16, textAlign: "center", marginTop: 4 }}>
          Please help me. My family has been notified.
        </Text>
      </View>

      {/* Family response status */}
      <View style={[ui.card, { flexDirection: "row", alignItems: "center", gap: 10 }]}>
        <Feather name={latest ? "check-circle" : "clock"} size={26} color={latest ? C.still : C.moving} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: latest ? C.still : C.text }}>
            {latest
              ? latest.kind === "way"
                ? `${latest.who} is on the way`
                : `${latest.who} will call this phone`
              : "Waiting for family to reply..."}
          </Text>
          <Text style={ui.muted}>
            {latest ? `Confirmed ${latest.time} via Telegram` : "Alert sent on Telegram"}
          </Text>
          {responses.slice(0, -1).map((r, i) => (
            <Text key={i} style={ui.muted}>
              {r.who}: {r.kind === "way" ? "on the way" : "will call"} ({r.time})
            </Text>
          ))}
        </View>
      </View>

      {/* Medical info */}
      <View style={ui.card}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: C.text, marginBottom: 6 }}>
          <Feather name="heart" size={16} /> Medical info
        </Text>
        <InfoRow label="Name" value={`${PROFILE.name}, ${PROFILE.age}`} />
        <InfoRow label="Blood type" value={PROFILE.bloodType} />
        <InfoRow label="Conditions" value={PROFILE.conditions} />
        <InfoRow label="Allergies" value={PROFILE.allergies} highlight />
        <InfoRow label="Medicine" value={PROFILE.medications} />
      </View>

      {/* Family contact, tap to call */}
      <TouchableOpacity style={ui.card} onPress={() => Linking.openURL(telLink(PROFILE.contactPhone))}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: C.text }}>
          <Feather name="users" size={16} /> Family contact
        </Text>
        <Text style={{ fontSize: 15, color: C.text, marginTop: 4 }}>
          {PROFILE.contactName} ({PROFILE.contactRelation})
        </Text>
        <Text style={{ fontSize: 24, fontWeight: "800", color: C.green, marginTop: 2 }}>
          <Feather name="phone-call" size={22} /> {PROFILE.contactPhone}
        </Text>
        <Text style={ui.muted}>Tap to call</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[ui.btn, ui.btnGreen, helping && { opacity: 0.7 }]} onPress={imHelping}>
        <Feather name={helping ? "check" : "user-check"} size={20} color="#fff" />
        <Text style={ui.btnText}>{helping ? "Thank you! Family has been told" : "I'm here to help"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[ui.btn, ui.btnGrey]} onPress={() => Linking.openURL(telLink(AMBULANCE_NUMBER))}>
        <Feather name="plus-square" size={20} color="#fff" />
        <Text style={ui.btnText}>Call ambulance {AMBULANCE_NUMBER}</Text>
      </TouchableOpacity>

      {/* Long press so a stranger can't close it by accident */}
      <Pressable onLongPress={onClose} delayLongPress={3000} style={{ marginTop: 20, padding: 12, alignItems: "center" }}>
        <Text style={ui.muted}>Press and hold 3 seconds to close</Text>
      </Pressable>
    </ScrollView>
  );
}

function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={{ flexDirection: "row", paddingVertical: 3 }}>
      <Text style={[ui.muted, { width: 92, fontSize: 14 }]}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 15, color: highlight ? C.impact : C.text, fontWeight: highlight ? "700" : "400" }}>
        {value}
      </Text>
    </View>
  );
}
