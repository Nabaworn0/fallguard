import React, { useEffect, useState } from "react";
import { Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { HistoryItem, clearHistory, loadHistory } from "./storage";
import { C, ui } from "./ui";

const COLORS: Record<HistoryItem["status"], string> = {
  SENT: C.impact,
  CANCELLED: C.still,
  FAILED: C.moving,
};

const ICONS: Record<HistoryItem["status"], React.ComponentProps<typeof Feather>["name"]> = {
  SENT: "send",
  CANCELLED: "check-circle",
  FAILED: "x-circle",
};

const LABELS: Record<HistoryItem["status"], string> = {
  SENT: "Alert sent",
  CANCELLED: "Cancelled (user OK)",
  FAILED: "Send failed",
};

export default function HistoryScreen() {
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    loadHistory().then(setItems);
  }, []);

  const clear = async () => {
    await clearHistory();
    setItems([]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: 48 }}>
      <Text style={ui.title}>History</Text>
      {items.length === 0 && (
        <View style={{ alignItems: "center", marginTop: 40 }}>
          <Feather name="clock" size={48} color={C.muted} />
          <Text style={[ui.muted, { marginTop: 8, fontSize: 15 }]}>No events yet.</Text>
        </View>
      )}
      {items.map((it, i) => (
        <View key={i} style={[ui.card, { flexDirection: "row", gap: 12 }]}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: COLORS[it.status],
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Feather name={ICONS[it.status]} size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700", color: COLORS[it.status] }}>{LABELS[it.status]}</Text>
            <Text style={ui.muted}>{it.time}</Text>
          {!!it.maps && (
            <TouchableOpacity onPress={() => Linking.openURL(it.maps as string)}>
              <Text style={{ color: C.green, fontWeight: "600", marginTop: 4 }}>
                <Feather name="map-pin" size={14} /> Open location in Maps
              </Text>
            </TouchableOpacity>
          )}
            {!!it.note && <Text style={[ui.muted, { marginTop: 4 }]}>{it.note}</Text>}
          </View>
        </View>
      ))}
      {items.length > 0 && (
        <TouchableOpacity style={[ui.btn, ui.btnGrey]} onPress={clear}>
          <Feather name="trash-2" size={20} color="#fff" />
          <Text style={ui.btnText}>Clear history</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
