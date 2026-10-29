import { StatusBar, StyleSheet } from "react-native";

/** App theme: cream background, navy text, soft green / coral / plum / mustard accents */
export const C = {
  bg: "#fdf8ee",
  card: "#ffffff",
  text: "#2d3a5a",
  muted: "#7a7f8e",
  border: "#efe6d4",
  green: "#5db38a",
  coral: "#f07558",
  plum: "#a9547a",
  mustard: "#f0c14f",
  // Status colors for values (darker so they read on white)
  still: "#3e9b6e",
  moving: "#d9a21b",
  freeFall: "#4a7fc1",
  impact: "#e0563b",
};

// Soft drop shadow like the reference design
const shadow = {
  shadowColor: "#c9a96e",
  shadowOpacity: 0.25,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
};

export const ui = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 20,
    paddingTop: (StatusBar.currentHeight ?? 24) + 12,
  },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 12, color: C.text, textAlign: "center" },
  label: { fontSize: 13, color: C.muted, marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  btn: {
    backgroundColor: C.green,
    padding: 18,
    borderRadius: 30,
    flexDirection: "row", // icon + label side by side
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    ...shadow,
  },
  btnRed: { backgroundColor: C.coral },
  btnGreen: { backgroundColor: C.green },
  btnGrey: { backgroundColor: C.plum },
  btnYellow: { backgroundColor: C.mustard },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  card: { backgroundColor: C.card, borderRadius: 20, padding: 14, marginTop: 10, ...shadow },
  muted: { color: C.muted, fontSize: 13 },
});
