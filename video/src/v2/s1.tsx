// Scenes 1-6: cold open, Apprentice enters, the student, the judge, the verdict, escalation.
import React from "react";
import { useGsap } from "../fx";
import { FONT, HAND, P, SW } from "./cast";
import { useBeat } from "./Film";
import { cam, Card, fly, judge, L, meter, Q, Stage, UNIT, write } from "./world";

export const Svg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={1280} height={720} viewBox="0 0 1280 720" style={{ position: "absolute", inset: 0 }}>{children}</svg>
);
const root: React.CSSProperties = { position: "absolute", inset: 0 };
const APP_OUT: [number, number] = [240, L.routeY];
const T = L.at.teacher, ST = L.at.student, J = L.at.judge;

/** Big teacher handles every card; the meter ticks once per answer. */
export const ColdOpen: React.FC = () => {
  const b = useBeat();
  const N = 10;
  const ref = useGsap((tl, q) => {
    tl.set(q(".teacher-g"), { scale: 1.35, svgOrigin: `${L.teacher.x} ${L.teacher.y}` }, 0);
    for (let k = 0; k < N; k++) {
      const t0 = 0.05 + k * 0.72;
      const start: [number, number] = k === 0 ? [620, 380] : APP_OUT; // first card already in flight
      const arrive = fly(tl, q, `c${k}`, [start, T], t0, k === 0 ? 0.45 : 0.85);
      write(tl, q, `c${k}`, arrive, 0.3);
      meter(tl, q, k * UNIT, (k + 1) * UNIT, arrive + 0.3, 0.12);
      fly(tl, q, `c${k}`, [T, APP_OUT], arrive + 0.4, 0.75);
      tl.to(q(`.c${k}`), { opacity: 0, duration: 0.15 }, arrive + 1.1);
    }
    tl.to(q(".tag"), { opacity: 1, duration: 0.15, stagger: 0.05 }, b("Most are easy"));
    cam(tl, q, 1.1, 820, 400, b("big AI"), 1.6);
    tl.to(q(".meter"), { scale: 1.15, svgOrigin: `${L.meter.x} ${L.meter.y}`, duration: 0.2, yoyo: true, repeat: 3 }, b("big-model prices"));
  });
  return (
    <div ref={ref} style={root}><Svg>
      <Stage student={false} judge={false} memory={false} box={false} hosted={false}>
        <line x1={240} y1={L.routeY} x2={940} y2={L.routeY} stroke={P.ink} strokeWidth={3} strokeDasharray="1 12" strokeLinecap="round" opacity={0.6} />
        {Array.from({ length: N }).map((_, k) => (
          <Card key={k} cls={`c${k}`} ink={P.teacher} tag={k % 5 === 4 ? undefined : "easy"} label={k === 0 ? "today's sales?" : undefined} />
        ))}
      </Stage>
    </Svg></div>
  );
};

/** The student desk appears; easy cards stop there, hard ones still go to the teacher; the box draws around it. */
export const EnterApprentice: React.FC = () => {
  const b = useBeat();
  const ref = useGsap((tl, q) => {
    tl.set(q(".teacher-g"), { scale: 1.35, svgOrigin: `${L.teacher.x} ${L.teacher.y}` }, 0)
      .to(q(".teacher-g"), { scale: 1, duration: 0.9, ease: "power2.inOut" }, 0.2)
      .set(q(".abox-line"), { strokeDashoffset: 1000, strokeDasharray: "1000 1000" }, 0)
      .set(q(".abox-name, .hosted, .port"), { opacity: 0 }, 0)
      .from(q(".student-g"), { opacity: 0, y: 40, duration: 0.6, ease: "back.out(1.6)" }, b("small model"));
    ["e0", "e1"].forEach((c, i) => {
      const t = b("easy ones") + i * 0.5;
      const a = fly(tl, q, c, [APP_OUT, ST], t, 0.6);
      write(tl, q, c, a, 0.3);
      fly(tl, q, c, [ST, APP_OUT], a + 0.4, 0.6);
      tl.to(q(`.${c}`), { opacity: 0, duration: 0.15 }, a + 1.0);
    });
    const h = fly(tl, q, "e2", [APP_OUT, T], b("learned the hard"), 0.8);
    write(tl, q, "e2", h, 0.3);
    meter(tl, q, 0, UNIT, h + 0.3, 0.12);
    tl.to(q(".learn"), { strokeDashoffset: 0, duration: 0.8, ease: "power1.inOut" }, h + 0.3)
      .to(q(".e2"), { opacity: 0, duration: 0.2 }, h + 0.6)
      .to(q(".abox-line"), { strokeDashoffset: 0, duration: 1.2, ease: "power1.inOut" }, b("That's Apprentice"))
      .to(q(".abox-name"), { opacity: 1, duration: 0.3 }, b("That's Apprentice") + 0.5)
      .to(q(".hosted"), { opacity: 1, duration: 0.4 }, b("That's Apprentice") + 0.8)
      .to(q(".port"), { opacity: 1, duration: 0.3 }, b("OpenAI API") - 0.2)
      .from(q(".port"), { x: -30, duration: 0.4, ease: "back.out(2)" }, b("OpenAI API") - 0.2);
  });
  return (
    <div ref={ref} style={root}><Svg>
      <Stage judge={false} memory={false}>
        <line x1={240} y1={L.routeY} x2={940} y2={L.routeY} stroke={P.ink} strokeWidth={3} strokeDasharray="1 12" strokeLinecap="round" opacity={0.6} />
        <path className="learn" d={`M ${T[0]} ${T[1] - 60} C 900 200, 600 200, ${ST[0]} ${ST[1] - 70}`} fill="none" stroke={P.teacher} strokeWidth={SW} strokeDasharray="1 1" strokeDashoffset={1} pathLength={1} />
        <g className="port"><rect x={290} y={L.routeY - 16} width={20} height={32} rx={4} fill={P.paper2} stroke={P.ink} strokeWidth={SW} />
          <text x={300} y={L.routeY - 26} textAnchor="middle" fontFamily={FONT} fontSize={17} fontWeight={700} fill={P.ink}>OpenAI API</text></g>
        {["e0", "e1"].map((c) => <Card key={c} cls={c} ink={P.student} tag="easy" />)}
        <Card cls="e2" ink={P.teacher} />
      </Stage>
    </Svg></div>
  );
};

/** Medium shot on the student: local, free. Screen-fixed meter stays still. */
export const StudentDesk: React.FC = () => {
  const b = useBeat();
  const ref = useGsap((tl, q) => {
    tl.set(q(".cam"), { scale: 1.7, x: 640 - 430 * 1.7, y: 380 - 500 * 1.7, svgOrigin: "0 0" }, 0);
    const a = fly(tl, q, "s0", [[160, 470], ST], 0.2, 0.7);
    tl.from(q(".sticker"), { opacity: 0, y: 10, duration: 0.3 }, b("student") - 0.2)
      .to(q(".sticker-u"), { strokeDashoffset: 0, duration: 0.4 }, b("Kwen"))
      .to(q(".local"), { strokeDashoffset: 0, duration: 0.9 }, b("running on your machine"))
      .from(q(".local-l"), { opacity: 0, duration: 0.3 }, b("running on your machine") + 0.6);
    write(tl, q, "s0", Math.max(a, b("cost nothing") - 0.3), 0.9);
    tl.from(q(".free"), { opacity: 0, scale: 0.6, svgOrigin: "1150 120", duration: 0.3, ease: "back.out(2)" }, b("cost nothing"));
    fly(tl, q, "s0", [ST, [120, 470]], b("cost nothing") + 1.2, 0.8);
  });
  return (
    <div ref={ref} style={root}><Svg>
      <Stage judge={false} meter={false}>
        <text className="sticker" x={420} y={582} textAnchor="middle" fontFamily={HAND} fontSize={15} fontWeight={700} fill={P.student}>Qwen3 1.7B</text>
        <line className="sticker-u" x1={380} y1={590} x2={460} y2={590} stroke={P.student} strokeWidth={2} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1} />
        <rect className="local" x={320} y={400} width={210} height={215} rx={14} fill="none" stroke={P.student} strokeWidth={2} strokeDasharray="1 1" pathLength={1} strokeDashoffset={1} />
        <text className="local-l" x={425} y={392} textAnchor="middle" fontFamily={FONT} fontSize={14} fontWeight={700} fill={P.student}>local · Ollama</text>
        <Card cls="s0" ink={P.student} />
      </Stage>
      <g transform={`translate(${L.meter.x} ${L.meter.y})`}>
        <rect x={-92} y={-34} width={184} height={68} rx={8} fill="#FFFFFF" stroke={P.judge} strokeWidth={SW + 1} />
        <text x={0} y={11} textAnchor="middle" fontFamily="Consolas, monospace" fontWeight={700} fontSize={30} fill={P.ink}>$0.0000</text>
      </g>
      <text className="free" x={1150} y={130} textAnchor="middle" fontFamily={HAND} fontSize={24} fontWeight={700} fill={P.student}>$0 per token</text>
    </Svg></div>
  );
};

/** Close on the judge: a magnifier sweeps the card; a wrong line darkens; Kev's nameplate drops. */
export const JudgeBooth: React.FC = () => {
  const b = useBeat();
  const ref = useGsap((tl, q) => {
    tl.set(q(".cam"), { scale: 1.6, x: 640 - 740 * 1.6, y: 390 - 480 * 1.6, svgOrigin: "0 0" }, 0);
    const a = fly(tl, q, "j0", [[560, 470], J], 0.1, 0.6);
    write(tl, q, "j0", a - 0.2, 0.5);
    tl.set(q(".mag"), { x: J[0] - 50, y: J[1] }, 0)
      .to(q(".mag"), { opacity: 1, duration: 0.2 }, b("a judge checks"))
      .to(q(".mag"), { x: J[0] + 40, duration: 1.2, ease: "sine.inOut" }, b("a judge checks"))
      .to(q(".mag"), { y: J[1] + 16, duration: 0.3 }, b("a judge checks") + 1.2)
      .from(q(".plate"), { y: -80, opacity: 0, duration: 0.5, ease: "bounce.out" }, b("Meet Kev"))
      .to(q(".judge-g .needle"), { rotation: -40, transformOrigin: "50% 100%", duration: 0.15, yoyo: true, repeat: 3 }, b("tiny open model"));
  });
  return (
    <div ref={ref} style={root}><Svg>
      <Stage meter={false}>
        <Card cls="j0" ink={P.student} bent />
        <g className="mag" opacity={0}><circle r={30} fill="#ffffff55" stroke={P.judge} strokeWidth={SW + 1} /><line x1={21} y1={21} x2={44} y2={44} stroke={P.ink} strokeWidth={SW + 3} strokeLinecap="round" /></g>
        <g className="plate" transform={`translate(${L.judge.x + 20} 392)`}>
          <rect x={-58} y={-16} width={116} height={30} rx={4} fill={P.judge} stroke={P.ink} strokeWidth={SW} />
          <text x={0} y={7} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={17} fill={P.ink}>Kev 0.8B</text>
        </g>
      </Stage>
    </Svg></div>
  );
};

/** Confident answer: needle 0.93, past the 0.8 notch, APPROVED, straight back to the app. */
export const JudgeVerdict: React.FC = () => {
  const b = useBeat();
  const ref = useGsap((tl, q) => {
    tl.set(q(".cam"), { scale: 1.5, x: 640 - 740 * 1.5, y: 390 - 480 * 1.5, svgOrigin: "0 0" }, 0);
    tl.set(q(".v0 .ink path"), { strokeDashoffset: 0 }, 0).set(q(".v0"), { x: J[0], y: J[1], opacity: 1 }, 0);
    judge(tl, q, "v0", 0.93, b("scores its confidence"));
    tl.to(q(".judge-g .notch"), { opacity: 0.2, duration: 0.12, yoyo: true, repeat: 3 }, b("Zero point eight"));
    tl.to(q(".cam"), { scale: 1, x: 0, y: 0, duration: 0.9, ease: "power2.inOut" }, b("straight back") - 0.4);
    fly(tl, q, "v0", [J, APP_OUT], b("straight back"), 0.8);
  });
  return (
    <div ref={ref} style={root}><Svg>
      <Stage>
        <Card cls="v0" ink={P.student} mark="ok" />
      </Stage>
    </Svg></div>
  );
};

/** Unsure answer: needle 0.41, UNSURE, card crosses the hosted line, teacher writes, meter ticks once. */
export const TeacherEscalation: React.FC = () => {
  const b = useBeat();
  const ref = useGsap((tl, q) => {
    tl.set(q(".x0 .ink path"), { strokeDashoffset: 0 }, 0).set(q(".x0"), { x: J[0], y: J[1], opacity: 1 }, 0);
    judge(tl, q, "x0", 0.41, b("Lower"));
    const a = fly(tl, q, "x0", [J, [L.hosted, 380], T], b("escalates"), 0.5);
    tl.to(q(".x0"), { opacity: 0, duration: 0.2 }, a + 0.1)
      .set(q(".x1"), { x: T[0], y: T[1], opacity: 1 }, a + 0.1)
      .from(q(".plate"), { y: -60, opacity: 0, duration: 0.5, ease: "bounce.out" }, b("G L M"));
    write(tl, q, "x1", b("G L M") + 0.2, 0.9);
    meter(tl, q, 0, UNIT, b("G L M") + 1.1, 0.15);
    fly(tl, q, "x1", [T, [L.hosted - 40, 380], L.at.memory], b("open-weight model"), 0.55);
  });
  return (
    <div ref={ref} style={root}><Svg>
      <Stage>
        <Card cls="x0" ink={P.student} mark="no" bent />
        <Card cls="x1" ink={P.teacher} />
        <g className="plate" transform={`translate(${L.teacher.x} 548)`}>
          <rect x={-80} y={-18} width={160} height={34} rx={4} fill={P.teacher} stroke={P.ink} strokeWidth={SW} />
          <text x={0} y={6} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={18} fill="#fff">GLM-5.2</text>
          <text x={0} y={40} textAnchor="middle" fontFamily={FONT} fontSize={15} fill={P.soft}>open weights</text>
        </g>
      </Stage>
    </Svg></div>
  );
};

export type { Q };
