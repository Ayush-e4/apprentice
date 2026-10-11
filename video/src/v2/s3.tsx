// Code edit, training-notebook B-roll, test bench, results, and one real tested example.
import gsap from "gsap";
import React from "react";
import { OffthreadVideo, staticFile } from "remotion";
import { useGsap } from "../fx";
import { FONT, HAND, P, SW } from "./cast";
import { useBeat } from "./Film";
import { Svg } from "./s1";
import { App, Card, fly, judge, L, Q, Stage } from "./world";

const root: React.CSSProperties = { position: "absolute", inset: 0 };
const APP_OUT: [number, number] = [240, L.routeY];

const count = (tl: gsap.core.Timeline, els: Element[], from: number, to: number, at: number, dur: number, fmt: (v: number) => string) => {
  const o = { v: from };
  tl.to(o, { v: to, duration: dur, ease: "power1.out", onUpdate: () => els.forEach((e) => { e.textContent = fmt(o.v); }) }, at);
};

/** The one line that changes: base_url points at Apprentice instead of the hosted API. */
export const CodeEdit: React.FC = () => {
  const b = useBeat();
  const ref = useGsap((tl, q) => {
    tl.fromTo(q(".editor"), { scale: 1 }, { scale: 1.08, duration: 4, ease: "none", transformOrigin: "55% 52%" }, 0)
      .to(q(".sel"), { backgroundColor: "#F3D58A", duration: 0.15 }, b("Change one") - 0.1)
      .to(q(".url"), { text: { value: "http://localhost:8000/v1", delimiter: "" }, duration: 0.9, ease: "none" }, b("base URL") + 0.2)
      .to(q(".sel"), { backgroundColor: "#00000000", duration: 0.2 }, b("base URL") + 1.1);
  });
  const code: React.CSSProperties = { fontFamily: "Consolas, 'Cascadia Mono', monospace", fontSize: 30, lineHeight: 1.6, color: P.ink, whiteSpace: "pre" };
  return (
    <div ref={ref} style={{ ...root, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="editor" style={{ width: 900, background: "#fff", border: `3px solid ${P.ink}`, borderRadius: 12, boxShadow: `8px 10px 0 ${P.paper2}` }}>
        <div style={{ height: 44, borderBottom: `2px solid ${P.ink}`, display: "flex", alignItems: "center", padding: "0 18px", fontFamily: FONT, fontSize: 18, color: P.soft }}>app.py</div>
        <div style={{ padding: "22px 30px", ...code }}>
          <div><span style={{ color: P.teacher }}>from</span> openai <span style={{ color: P.teacher }}>import</span> OpenAI</div>
          <div> </div>
          <div>client = OpenAI(</div>
          <div>    base_url=<span style={{ color: P.student }}>"</span><span className="sel" style={{ color: P.student, borderRadius: 4 }}><span className="url">https://api.openai.com/v1</span></span><span style={{ color: P.student }}>"</span>,</div>
          <div>)</div>
        </div>
      </div>
    </div>
  );
};

/** Real training notebook (GitHub) as B-roll; the measured numbers sit in the paper margin, not in the capture. */
export const BrollColab: React.FC = () => {
  const b = useBeat();
  const ref = useGsap((tl, q) => {
    tl.from(q(".n45"), { opacity: 0, x: -10, duration: 0.3 }, b("from forty-six"))
      .to(q(".arrow"), { strokeDashoffset: 0, duration: 0.6 }, b("to ninety-nine") - 0.1)
      .from(q(".n99"), { opacity: 0, scale: 0.7, transformOrigin: "50% 50%", duration: 0.35, ease: "back.out(2)" }, b("to ninety-nine") + 0.4)
      .from(q(".held"), { opacity: 0, duration: 0.3 }, b("accuracy"));
  });
  return (
    <div ref={ref} style={root}>
      <OffthreadVideo src={staticFile("broll/notebook.mp4")} muted style={{ position: "absolute", inset: 0, width: 1280, height: 720 }} />
      <Svg>
        <text className="n45" x={1112} y={250} textAnchor="middle" fontFamily={HAND} fontSize={44} fontWeight={700} fill={P.judge}>45.7%</text>
        <path className="arrow" d="M 1112 275 C 1140 330, 1140 380, 1112 430" fill="none" stroke={P.judge} strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1} />
        <path className="arrow" d="M 1098 414 L 1112 432 L 1128 416" fill="none" stroke={P.judge} strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1} />
        <text className="n99" x={1112} y={490} textAnchor="middle" fontFamily={HAND} fontSize={52} fontWeight={700} fill={P.judge}>99.3%</text>
        <text className="held" x={1112} y={526} textAnchor="middle" fontFamily={FONT} fontSize={18} fill={P.soft}>judge accuracy, held-out</text>
      </Svg>
    </div>
  );
};

/** Grid helpers: 20 x 4 squares, one per question. */
const SQ = 17, GAP = 4, COLS = 20;
const cell = (i: number, x0: number, y0: number): [number, number] => [x0 + (i % COLS) * (SQ + GAP), y0 + Math.floor(i / COLS) * (SQ + GAP)];
type Kind = "s" | "t" | "x" | "q"; // student right, teacher, wrong, plain question
const LANE3: Kind[] = Array.from({ length: 80 }, (_, i) => ((i === 23 || i === 61) ? "x" : [5, 12, 19, 28, 34, 41, 47, 55, 66, 72, 78].includes(i) ? "t" : "s"));
const fill = (k: Kind) => (k === "s" ? P.student : k === "t" ? P.teacher : "#fff");
// plain question squares are white with ink outline
const stroke = (k: Kind) => (k === "x" ? P.bad : P.ink);

const Grid: React.FC<{ cls: string; kinds: Kind[]; x0: number; y0: number }> = ({ cls, kinds, x0, y0 }) => (
  <g>
    {kinds.map((k, i) => {
      const [x, y] = cell(i, x0, y0);
      return <rect key={i} className={`${cls} ${cls}-${k}`} x={x} y={y} width={SQ} height={SQ} rx={3} fill={fill(k)} stroke={stroke(k)} strokeWidth={k === "x" ? 2.5 : 1.5} />;
    })}
  </g>
);

/** 80 held-out question cards fan out into a grid; a dashed line keeps them apart from memory. */
export const TestBench: React.FC = () => {
  const b = useBeat();
  const ref = useGsap((tl, q) => {
    tl.from(q(".qsq"), { x: (i: number) => 300 - cell(i, 430, 270)[0], y: (i: number) => 360 - cell(i, 430, 270)[1], opacity: 0, duration: 0.5, stagger: 0.018, ease: "power2.out" }, 0.3)
      .from(q(".held-box"), { opacity: 0, duration: 0.4 }, b("held-out"))
      .from(q(".held-l"), { opacity: 0, y: 8, duration: 0.3 }, b("held-out") + 0.2);
  });
  return (
    <div ref={ref} style={root}><Svg>
      <g transform="translate(-128 -72) scale(1.2)">
      {Array.from({ length: 6 }).map((_, i) => <rect key={i} x={250 + i * 3} y={320 - i * 5} width={100} height={70} rx={4} fill="#fff" stroke={P.ink} strokeWidth={2} />)}
      <text x={300} y={430} textAnchor="middle" fontFamily={FONT} fontSize={20} fontWeight={700} fill={P.ink}>80 questions</text>
      <Grid cls="qsq" kinds={Array(80).fill("q") as Kind[]} x0={430} y0={270} />
      <rect className="held-box" x={410} y={250} width={460} height={124} rx={10} fill="none" stroke={P.ink} strokeWidth={2} strokeDasharray="8 6" />
      <text className="held-l" x={640} y={410} textAnchor="middle" fontFamily={HAND} fontSize={24} fontWeight={700} fill={P.ink}>held-out · never in memory</text>
      <text x={640} y={470} textAnchor="middle" fontFamily={FONT} fontSize={18} fill={P.soft}>text-to-SQL on a shop database</text>
      </g>
    </Svg></div>
  );
};

/** Three lanes: new student 25%, teacher 100%, Apprentice after learning 97.5% (78/80). */
export const ResultsAccuracy: React.FC = () => {
  const b = useBeat();
  const lanes: { cls: string; label: string; kinds: Kind[]; to: number; word: string }[] = [
    { cls: "l1", label: "student, new", kinds: Array.from({ length: 80 }, (_, i) => ((i * 37) % 80 < 20 ? "s" : "x")), to: 25, word: "New student" },
    { cls: "l2", label: "teacher only", kinds: Array(80).fill("t") as Kind[], to: 100, word: "Teacher" },
    { cls: "l3", label: "Apprentice", kinds: LANE3, to: 97.5, word: "Apprentice, after" },
  ];
  const ref = useGsap((tl, q) => {
    lanes.forEach((ln) => {
      tl.from(q(`.${ln.cls}`), { opacity: 0, scale: 0.4, transformOrigin: "50% 50%", duration: 0.25, stagger: 0.008 }, b(ln.word))
        .from(q(`.${ln.cls}-label`), { opacity: 0, duration: 0.2 }, b(ln.word));
      count(tl, q(`.${ln.cls}-v`), 0, ln.to, b(ln.word) + 0.1, 0.8, (v) => `${v.toFixed(ln.to % 1 ? 1 : 0)}%`);
    });
  });
  return (
    <div ref={ref} style={root}><Svg>
      <text x={640} y={110} textAnchor="middle" fontFamily={FONT} fontSize={22} fill={P.soft}>80 held-out questions · one square each</text>
      {lanes.map((ln, k) => (
        <g key={ln.cls}>
          <text className={`${ln.cls}-label`} x={300} y={205 + k * 150} textAnchor="end" fontFamily={FONT} fontSize={24} fontWeight={700} fill={P.ink}>{ln.label}</text>
          <Grid cls={ln.cls} kinds={ln.kinds} x0={330} y0={160 + k * 150} />
          <text className={`${ln.cls}-v`} x={790} y={215 + k * 150} fontFamily="Consolas, monospace" fontSize={40} fontWeight={700} fill={P.ink}>0%</text>
        </g>
      ))}
      <g transform="translate(330 640)">
        {[["s", "student, right"], ["t", "teacher"], ["x", "wrong"]].map(([k, t], i) => (
          <g key={k} transform={`translate(${i * 200} 0)`}><rect width={SQ} height={SQ} rx={3} fill={fill(k as Kind)} stroke={stroke(k as Kind)} strokeWidth={2} /><text x={26} y={15} fontFamily={FONT} fontSize={18} fill={P.soft}>{t}</text></g>
        ))}
      </g>
    </Svg></div>
  );
};

/** The Apprentice squares sort into who answered (86% student); two meters stop at $0.1260 vs $0.0165. */
export const ResultsCost: React.FC = () => {
  const b = useBeat();
  const order = LANE3.map((k, i) => ({ k, i }));
  const local = order.filter((o) => o.k !== "t"), hosted = order.filter((o) => o.k === "t");
  const ref = useGsap((tl, q) => {
    const sq = q(".rc");
    local.forEach((o, n) => { const [x, y] = cell(n, 300, 150); const [x0, y0] = cell(o.i, 330, 150); tl.to(sq[o.i], { x: x - x0, y: y - y0, duration: 0.7, ease: "power2.inOut" }, b("handled") + n * 0.004); });
    hosted.forEach((o, n) => { const [x, y] = [800 + (n % 4) * (SQ + GAP), 150 + Math.floor(n / 4) * (SQ + GAP)]; const [x0, y0] = cell(o.i, 330, 150); tl.to(sq[o.i], { x: x - x0, y: y - y0, duration: 0.7, ease: "power2.inOut" }, b("handled")); });
    tl.from(q(".pct"), { opacity: 0, y: 10, duration: 0.3 }, b("eighty-six") + 0.3)
      .from(q(".meters"), { opacity: 0, duration: 0.3 }, b("and the bill") - 0.2);
    count(tl, q(".m-t"), 0, 0.126, b("and the bill"), 1.6, (v) => `$${v.toFixed(4)}`);
    count(tl, q(".m-a"), 0, 0.0165, b("and the bill"), 1.6, (v) => `$${v.toFixed(4)}`);
    tl.to(q(".brk"), { strokeDashoffset: 0, duration: 0.4 }, b("eighty-seven")).from(q(".minus"), { opacity: 0, scale: 0.6, transformOrigin: "50% 50%", duration: 0.3, ease: "back.out(2)" }, b("eighty-seven") + 0.3);
  });
  return (
    <div ref={ref} style={root}><Svg>
      <Grid cls="rc" kinds={LANE3} x0={330} y0={150} />
      <g className="pct">
        <text x={505} y={270} textAnchor="middle" fontFamily={FONT} fontSize={30} fontWeight={800} fill={P.student}>69 by student · 86%</text>
        <text x={840} y={270} textAnchor="middle" fontFamily={FONT} fontSize={20} fontWeight={700} fill={P.teacher}>11 by teacher · 14%</text>
      </g>
      <g className="meters">
        {[["m-t", "teacher only", 400], ["m-a", "Apprentice", 880]].map(([c, label, x]) => (
          <g key={c as string} transform={`translate(${x} 470)`}>
            <rect x={-130} y={-44} width={260} height={88} rx={10} fill="#fff" stroke={P.judge} strokeWidth={SW + 1} />
            <text className={c as string} x={0} y={14} textAnchor="middle" fontFamily="Consolas, monospace" fontSize={40} fontWeight={700} fill={P.ink}>$0.0000</text>
            <text x={0} y={76} textAnchor="middle" fontFamily={FONT} fontSize={20} fill={P.soft}>{label}</text>
          </g>
        ))}
        <path className="brk" d="M 540 470 Q 640 420 740 470" fill="none" stroke={P.ink} strokeWidth={2.5} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1} />
        <text className="minus" x={640} y={430} textAnchor="middle" fontFamily={HAND} fontSize={40} fontWeight={700} fill={P.student}>−87%</text>
      </g>
    </Svg></div>
  );
};

/** One real tested question (from the recorded Kirana run): answered locally, judge 0.96, $0. */
export const RealExample: React.FC = () => {
  const b = useBeat();
  const ref = useGsap((tl, q) => {
    tl.from(q(".ask"), { opacity: 0, y: 10, duration: 0.4 }, b("A shop owner asks"));
    const a = fly(tl, q, "k0", [APP_OUT, L.at.student], b("in Hinglish"), 0.6);
    tl.to(q(".memory-g .tab")[2], { y: -10, duration: 0.2, ease: "back.out(3)" }, a)
      .to(q(".k0 .ink path"), { strokeDashoffset: 0, duration: 0.2, stagger: 0.2, ease: "none" }, a + 0.3);
    const j = fly(tl, q, "k0", [L.at.student, L.at.judge], a + 1.0, 0.45);
    judge(tl, q, "k0", 0.96, j);
    fly(tl, q, "k0", [L.at.judge, APP_OUT], j + 1.1, 0.6);
    tl.from(q(".ans"), { opacity: 0, y: 10, duration: 0.4 }, Math.max(j + 1.6, b("answers alone")))
      .from(q(".free"), { opacity: 0, duration: 0.3 }, b("for free"));
  });
  return (
    <div ref={ref} style={root}><Svg>
      <Stage meter="$0.0000" memFilled={6} app={<App label="shop owner" />}>
        <Card cls="k0" ink={P.student} mark="ok" />
      </Stage>
      <g className="ask">
        <rect x={40} y={30} width={560} height={56} rx={14} fill="#fff" stroke={P.ink} strokeWidth={2.5} />
        <text x={60} y={65} fontFamily={FONT} fontSize={20} fill={P.ink}>March 2026 mein sabse zyada orders kis store pe aaye?</text>
      </g>
      <g className="ans">
        <rect x={620} y={30} width={420} height={56} rx={14} fill={P.student} stroke={P.ink} strokeWidth={2.5} />
        <text x={640} y={65} fontFamily={FONT} fontSize={22} fontWeight={700} fill="#fff">Bandra Linking Road · 65 orders</text>
      </g>
      <text className="free" x={1150} y={130} textAnchor="middle" fontFamily={HAND} fontSize={22} fontWeight={700} fill={P.student}>answered locally · $0</text>
    </Svg></div>
  );
};

export type { Q };
