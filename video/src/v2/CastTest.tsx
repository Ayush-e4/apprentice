import React from "react";
import { AbsoluteFill } from "remotion";
import { Flow, Judge, Label, Memory, Meter, Note, P, Student, Teacher } from "./cast";

export const CastTest: React.FC = () => (
  <AbsoluteFill style={{ background: P.paper }}>
    <svg width={1280} height={720}>
      <line x1={0} y1={600} x2={1280} y2={600} stroke={P.line} strokeWidth={3} />
      <Student x={230} y={600} mood="happy" />
      <Judge x={560} y={600} stamp={0.5} />
      <Teacher x={930} y={600} />
      <Memory x={1170} y={600} scale={0.7} filled={6} count={27} />
      <Flow d="M 300 330 C 380 260, 480 260, 540 330" t={0.7} color={P.student} />
      <Note x={420} y={250} text="Today's sales?" rot={-4} />
      <Note x={760} y={260} mark="no" rot={3} />
      <Meter x={160} y={120} value="$0.0000" label="cost so far" color={P.student} />
      <Label x={640} y={90} size={34}>student · judge · teacher · memory</Label>
    </svg>
  </AbsoluteFill>
);
