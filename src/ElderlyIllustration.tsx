import React from "react";
import Svg, { Circle, Ellipse, Line, Path, Rect } from "react-native-svg";
import { C } from "./ui";

const SKIN = "#f5c9a5";
const HAIR = "#ececec";
const CANE = "#8d5a3b";

/** Flat cartoon of an elderly man with a cane, drawn in the app theme colors */
export default function ElderlyIllustration({ size = 160, protectedOn = false }: { size?: number; protectedOn?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {/* background blob and ground shadow */}
      <Circle cx={100} cy={105} r={86} fill="#fbe9c6" />
      <Ellipse cx={100} cy={186} rx={58} ry={6} fill="#efdcb5" />

      {/* legs and shoes */}
      <Rect x={82} y={128} width={15} height={54} rx={7} fill={C.text} />
      <Rect x={103} y={128} width={15} height={54} rx={7} fill={C.text} />
      <Ellipse cx={88} cy={183} rx={13} ry={5} fill="#6b4b3a" />
      <Ellipse cx={112} cy={183} rx={13} ry={5} fill="#6b4b3a" />

      {/* cane */}
      <Line x1={141} y1={128} x2={147} y2={184} stroke={CANE} strokeWidth={5} strokeLinecap="round" />
      <Path d="M141 128 q0 -11 -10 -9" stroke={CANE} strokeWidth={5} fill="none" strokeLinecap="round" />

      {/* arms (behind body) */}
      <Line x1={80} y1={94} x2={70} y2={128} stroke={C.mustard} strokeWidth={14} strokeLinecap="round" />
      <Line x1={120} y1={94} x2={138} y2={126} stroke={C.mustard} strokeWidth={14} strokeLinecap="round" />

      {/* body: mustard cardigan with buttons */}
      <Rect x={73} y={80} width={54} height={58} rx={20} fill={C.mustard} />
      <Path d="M92 81 L100 94 L108 81 Z" fill="#fff" />
      <Line x1={100} y1={94} x2={100} y2={136} stroke="#d9a21b" strokeWidth={2} />
      <Circle cx={104} cy={104} r={2} fill="#d9a21b" />
      <Circle cx={104} cy={118} r={2} fill="#d9a21b" />

      {/* hands */}
      <Circle cx={70} cy={130} r={7} fill={SKIN} />
      <Circle cx={139} cy={128} r={7} fill={SKIN} />

      {/* neck, ears, head */}
      <Rect x={93} y={70} width={14} height={14} rx={4} fill={SKIN} />
      <Circle cx={76} cy={58} r={6} fill={SKIN} />
      <Circle cx={124} cy={58} r={6} fill={SKIN} />
      <Circle cx={100} cy={56} r={24} fill={SKIN} />

      {/* white hair on the sides */}
      <Ellipse cx={79} cy={47} rx={8} ry={11} fill={HAIR} />
      <Ellipse cx={121} cy={47} rx={8} ry={11} fill={HAIR} />
      <Ellipse cx={100} cy={33} rx={10} ry={4} fill={HAIR} />

      {/* cheeks */}
      <Circle cx={84} cy={65} r={4} fill="#f4a99a" opacity={0.7} />
      <Circle cx={116} cy={65} r={4} fill="#f4a99a" opacity={0.7} />

      {/* glasses and eyes */}
      <Circle cx={91} cy={55} r={7} stroke={C.text} strokeWidth={2} fill="none" />
      <Circle cx={109} cy={55} r={7} stroke={C.text} strokeWidth={2} fill="none" />
      <Line x1={98} y1={55} x2={102} y2={55} stroke={C.text} strokeWidth={2} />
      <Circle cx={91} cy={55} r={2} fill={C.text} />
      <Circle cx={109} cy={55} r={2} fill={C.text} />

      {/* mustache and smile */}
      <Ellipse cx={100} cy={67} rx={10} ry={4} fill={HAIR} />
      <Path d="M95 72 q5 4 10 0" stroke={C.text} strokeWidth={2} fill="none" strokeLinecap="round" />

      {/* badge: green heart when protected, grey when off */}
      <Circle cx={160} cy={46} r={19} fill={protectedOn ? C.green : "#c9c2b4"} />
      <Path d="M160 55 l-8.5 -8.5 a5.5 5.5 0 0 1 8.5 -7 a5.5 5.5 0 0 1 8.5 7 z" fill="#fff" />
    </Svg>
  );
}
