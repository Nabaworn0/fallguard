import React, { useState } from "react";
import { Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Thresholds } from "./fallDetector";
import { Feather } from "@expo/vector-icons";
import ElderlyIllustration from "./ElderlyIllustration";
import { C, ui } from "./ui";

type Props = {
  monitoring: boolean;
  onToggle: () => void;
  magnitude: number;
  samples: number[];
  peak: number; // highest value in the last 10 seconds
  thresholds: Thresholds;
  paused: boolean; // app was in background while monitoring
  telegramReady: boolean; // token and chat ID are set
  onDismissPaused: () => void;
  onSimulateFall: () => void;
};

const CHART_H = 120;
const MAX_G = 4;

/** Word + color for a value, using the same thresholds as the detector */
function level(g: number, th: Thresholds) {
  if (g < th.freeFall) return { label: "Free fall", color: C.freeFall };
  if (g > th.impact) return { label: "Impact", color: C.impact };
  if (Math.abs(g - 1) < 0.15) return { label: "Still", color: C.still };
  return { label: "Moving", color: C.moving };
}

function ThresholdLine({ g, label, color }: { g: number; label: string; color: string }) {
  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: (Math.min(g, MAX_G) / MAX_G) * CHART_H,
        borderTopWidth: 1,
        borderColor: color,
      }}
    >
      <Text style={{ position: "absolute", right: 0, top: -15, fontSize: 10, color }}>{label}</Text>
    </View>
  );
}

function Chart({ samples, th, active }: { samples: number[]; th: Thresholds; active: boolean }) {
  return (
    <View style={{ height: CHART_H, marginTop: 12 }}>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-end" }}>
        {samples.map((s, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              marginHorizontal: 0.5,
              backgroundColor: active ? level(s, th).color : "#e6dccb",
              height: Math.max(2, (Math.min(s, MAX_G) / MAX_G) * CHART_H),
            }}
          />
        ))}
      </View>
      <ThresholdLine g={th.impact} label={`impact ${th.impact} g`} color={C.impact} />
      <ThresholdLine g={1} label="normal 1 g" color={C.still} />
      <ThresholdLine g={th.freeFall} label={`free fall ${th.freeFall} g`} color={C.freeFall} />
    </View>
  );
}

export default function MonitorScreen({
  monitoring,
  onToggle,
  magnitude,
  samples,
  peak,
  thresholds,
  paused,
  telegramReady,
  onDismissPaused,
  onSimulateFall,
}: Props) {
  const [dark, setDark] = useState(false);
  const now = level(magnitude, thresholds);

  // Monitoring Mode: black screen, long press to exit (avoids accidental taps in a pocket)
  if (monitoring && dark) {
    return (
      <Pressable
        style={{ flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}
        onLongPress={() => setDark(false)}
        delayLongPress={1500}
      >
        <Text style={{ color: C.green, fontSize: 20, fontWeight: "600" }}>FallGuard is monitoring</Text>
        <Text style={{ color: "#444", marginTop: 12 }}>Press and hold to exit</Text>
      </Pressable>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: 48, paddingBottom: 32 }}>
      <Text style={ui.title}>
        Fall<Text style={{ color: C.green }}>Guard</Text>
      </Text>

      <View style={{ alignItems: "center" }}>
        <ElderlyIllustration size={170} protectedOn={monitoring} />
        <Text style={{ fontSize: 17, color: C.text, textAlign: "center", marginTop: 4 }}>
          {monitoring ? "We're watching over you." : "Start monitoring to stay safe."}
        </Text>
      </View>

      {!telegramReady && (
        <View style={[ui.card, { backgroundColor: "#fdeae5", borderWidth: 1, borderColor: C.coral }]}>
          <Text style={{ fontWeight: "700", color: C.impact }}>
            <Feather name="alert-circle" size={15} /> Telegram is not set up
          </Text>
          <Text style={ui.muted}>
            Alerts cannot be sent. Set the Bot Token and Chat ID in .env.local and restart Expo.
          </Text>
        </View>
      )}

      {paused && (
        <TouchableOpacity
          onPress={onDismissPaused}
          style={[ui.card, { backgroundColor: "#fdf3d6", borderWidth: 1, borderColor: C.mustard }]}
        >
          <Text style={{ fontWeight: "700", color: C.text }}>
            <Feather name="pause-circle" size={15} /> Monitoring may have been paused
          </Text>
          <Text style={ui.muted}>
            The app was in the background. Keep the app open on screen for reliable detection. Tap to dismiss.
          </Text>
        </TouchableOpacity>
      )}

      <View style={ui.card}>
        <Text style={ui.muted}>Status</Text>
        <Text style={{ fontSize: 22, fontWeight: "700", color: monitoring ? C.still : C.impact }}>
          <Feather name={monitoring ? "shield" : "shield-off"} size={20} /> {monitoring ? "Monitoring ON" : "Monitoring OFF"}
        </Text>
        <Text style={[ui.muted, { marginTop: 8 }]}>
          <Feather name="activity" size={13} /> Total acceleration
        </Text>
        <Text style={{ fontSize: 34, fontWeight: "700", color: now.color }}>
          {magnitude.toFixed(2)} g · {now.label}
        </Text>
        <Text style={ui.muted}>1.00 g = normal (phone at rest)</Text>
        <Text style={{ fontSize: 16, marginTop: 8, color: C.text }}>
          Peak (last 10 s):{" "}
          <Text style={{ fontWeight: "700", color: level(peak, thresholds).color }}>
            {peak.toFixed(2)} g · {level(peak, thresholds).label}
          </Text>
        </Text>
        <Chart samples={samples} th={thresholds} active={monitoring} />
        <Text style={[ui.muted, { marginTop: 4 }]}>Last 12 seconds (scale 0 to 4 g)</Text>
      </View>

      <TouchableOpacity style={[ui.btn, monitoring ? ui.btnRed : ui.btnGreen]} onPress={onToggle}>
        <Feather name={monitoring ? "stop-circle" : "play-circle"} size={20} color="#fff" />
        <Text style={ui.btnText}>{monitoring ? "Stop monitoring" : "Start monitoring"}</Text>
      </TouchableOpacity>

      {monitoring && (
        <TouchableOpacity style={[ui.btn, ui.btnGrey]} onPress={() => setDark(true)}>
          <Feather name="moon" size={20} color="#fff" />
          <Text style={ui.btnText}>Monitoring Mode (black screen)</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[ui.btn, ui.btnYellow]} onPress={onSimulateFall}>
        <Feather name="alert-triangle" size={20} color={C.text} />
        <Text style={[ui.btnText, { color: C.text }]}>Simulate fall (demo)</Text>
      </TouchableOpacity>

      <Text style={[ui.muted, { marginTop: 16 }]}>
        Keep the app open and the phone charged. Detection pauses when the app is in the background.
      </Text>
    </ScrollView>
  );
}
