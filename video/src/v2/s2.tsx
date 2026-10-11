// Memory filing + recall, flywheel, honest limit, use case, outro.
import gsap from "gsap";
import React from "react";
import { useGsap } from "../fx";
import { FONT, HAND, P, SW } from "./cast";
import { useBeat } from "./Film";
import { Svg } from "./s1";
import { App, Card, fly, judge, L, meter, Q, Stage, UNIT, write } from "./world";

const root: React.CSSProperties = { position: "absolute", inset: 0 };
const APP_OUT: [number, number] = [240, L.routeY];
const ST = L.at.student, J = L.at.judge, T = L.at.teacher, M = L.at.memory;
const DOTS = [4, 7, 5, 8, 4, 6];
const TAB = (i: number): [number, number] => [L.memory.x + (-58 + i * 10) * 0.6, L.ground - 236 * 0.6];

const openDrawer = (tl: gsap.core.Timeline, q: Q, at: number, hold = 0.8) =>
  tl.to(q(".memory-g .drawer"), { y: -16, duration: 0.25, ease: "power2.out" }, at)
    .to(q(".memory-g .drawer"), { y: 0, duration: 0.25, ease: "power2.in" }, at + hold);

/** A copy of the teacher's answer gets a 6-dot fingerprint and is filed in the drawer. */
export const MemoryFile: React.FC = () => {
  const b = useBeat();
  const ref = useGsap((tl, q) => {
    tl.set(q(".m0, .m1"), { x: M[0], y: M[1] - 40, opacity: 1 }, 0).set(q(".m0 .ink path, .m1 .ink path"), { strokeDashoffset: 0 }, 0)
      .set(q(".memory-g .tab")[3], { opacity: 0 }, 0)
      .to(q(".m1"), { x: M[0] + 70, y: M[1] - 90, duration: 0.45, ease: "power2.out" }, b("The trick"))
      .to(q(".m1 .dots"), { opacity: 1, duration: 0.1 }, b("every teacher answer"))
      .from(q(".m1 .dots circle"), { scale: 0, transformOrigin: "50% 50%", stagger: 0.06, duration: 0.2 }, b("every teacher answer"));
    openDrawer(tl, q, b("into memory") - 0.3, 0.9);
    tl.to(q(".m1"), { x: L.memory.x, y: L.ground - 230 * 0.6, scale: 0.25, duration: 0.45, ease: "power2.in" }, b("into memory"))
      .to(q(".m1"), { opacity: 0, duration: 0.1 }, b("into memory") + 0.45)
      .to(q(".memory-g .tab")[3], { opacity: 1, duration: 0.1 }, b("into memory") + 0.45);
    fly(tl, q, "m0", [[M[0], M[1] - 40], APP_OUT], b("into memory") + 0.2, 0.7);
  });
  return (
    <div ref={ref} style={root}><Svg>
      <Stage meter={`$${UNIT.toFixed(4)}`} memFilled={4}>
        <Card cls="m0" ink={P.teacher} />
        <Card cls="m1" ink={P.teacher} dots={DOTS} />
      </Stage>
    </Svg></div>
  );
};

/** Similar question: same fingerprint, the worked example pins beside the student, the student solves it alone. */
export const MemoryRecall: React.FC = () => {
  const b = useBeat();
  const ref = useGsap((tl, q) => {
    const a = fly(tl, q, "r0", [APP_OUT, ST], 0.1, 0.6);
    tl.to(q(".r0 .dots"), { opacity: 1, duration: 0.2 }, b("similar question"))
      .to(q(".memory-g .tab")[3], { y: -10, duration: 0.25, ease: "back.out(3)" }, b("similar question") + 0.3)
      .to(q(".match"), { strokeDashoffset: 0, duration: 0.5 }, b("similar question") + 0.4);
    openDrawer(tl, q, b("worked example") - 0.2, 0.7);
    tl.set(q(".r1"), { x: L.memory.x, y: L.ground - 240 * 0.6, scale: 0.3, opacity: 1 }, b("worked example"))
      .set(q(".r1 .ink path"), { strokeDashoffset: 0 }, b("worked example"))
      .to(q(".r1"), { x: 430, y: 345, scale: 0.6, rotation: -6, duration: 0.6, ease: "power2.out" }, b("worked example"))
      .to(q(".match"), { opacity: 0, duration: 0.3 }, b("worked example") + 0.3);
    write(tl, q, "r0", Math.max(a, b("solves it alone") - 0.6), 0.7);
    const at = fly(tl, q, "r0", [ST, J], b("solves it alone") + 0.2, 0.5);
    judge(tl, q, "r0", 0.91, at);
    fly(tl, q, "r0", [J, APP_OUT], at + 1.15, 0.7);
  });
  const [tx, ty] = TAB(3);
  return (
    <div ref={ref} style={root}><Svg>
      <Stage meter={`$${UNIT.toFixed(4)}`} memFilled={4}>
        <path className="match" d={`M ${ST[0] - 40} ${ST[1] - 30} C ${ST[0] + 20} ${ST[1] - 120}, ${tx} ${ty - 80}, ${tx} ${ty}`} fill="none" stroke={P.memory} strokeWidth={2.5} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1} />
        <Card cls="r1" ink={P.teacher} />
        <Card cls="r0" ink={P.student} dots={DOTS} mark="ok" />
      </Stage>
    </Svg></div>
  );
};

const FLOW = "TSTTSTSTSSTSSSSTSSSSSSSS"; // 24 cards, preset: the teacher is needed less as memory grows

/** Time-lapse: memory fills, more cards stop at the student, the meter slows. */
export const Flywheel: React.FC = () => {
  const ref = useGsap((tl, q) => {
    let spent = 1;
    tl.set(q(".memory-g .tab"), { opacity: 0 }, 0).set(q(".memory-g .tab").slice(0, 4), { opacity: 1 }, 0);
    [...FLOW].forEach((d, k) => {
      const t = 0.15 + k * 0.17;
      const dest = d === "T" ? T : ST;
      fly(tl, q, `w${k}`, [APP_OUT, dest], t, 0.32);
      tl.to(q(`.w${k}`), { opacity: 0, duration: 0.1 }, t + 0.36);
      meter(tl, q, (k + 1) * UNIT, (k + 2) * UNIT, t + 0.32, 0.1, 4, ".ghost-val");
      if (d === "T") {
        meter(tl, q, spent * UNIT, (spent + 1) * UNIT, t + 0.32, 0.1);
        spent += 1;
        tl.to(q(".memory-g .tab")[Math.min(11, 3 + spent)], { opacity: 1, duration: 0.1 }, t + 0.4);
      }
    });
    tl.fromTo(q(".share"), { scaleX: 0.05 }, { scaleX: 0.86, duration: 4.1, ease: "power1.in", transformOrigin: "0% 50%" }, 0.15);
  });
  return (
    <div ref={ref} style={root}><Svg>
      <Stage meter={`$${UNIT.toFixed(4)}`} memFilled={12}>
        {[...FLOW].map((d, k) => <Card key={k} cls={`w${k}`} ink={d === "T" ? P.teacher : P.student} />)}
      </Stage>
      <text x={1150} y={124} textAnchor="middle" fontFamily={FONT} fontSize={18} fill={P.soft}>teacher-only <tspan className="ghost-val">$0.0016</tspan></text>
      <text x={300} y={668} fontFamily={FONT} fontSize={18} fontWeight={700} fill={P.student}>student</text>
      <rect x={380} y={654} width={500} height={18} rx={9} fill="#fff" stroke={P.ink} strokeWidth={2} />
      <rect className="share" x={382} y={656} width={496} height={14} rx={7} fill={P.student} />
    </Svg></div>
  );
};

/** New question shape: fingerprints don't match, memory can't help; bars show 53% vs 33%. Repeats still snap. */
export const HonestLimit: React.FC = () => {
  const b = useBeat();
  const ref = useGsap((tl, q) => {
    tl.set(q(".cam"), { scale: 1.35, x: 420 - 500 * 1.35, y: 380 - 470 * 1.35, svgOrigin: "0 0" }, 0)
      .set(q(".bar53, .bar33"), { scaleX: 0, transformOrigin: "0% 50%" }, 0);
    fly(tl, q, "h0", [[100, 470], ST], 0.2, 0.6);
    tl.to(q(".h0 .dots"), { opacity: 1, duration: 0.2 }, b("The catch") + 0.4);
    openDrawer(tl, q, b("never seen") - 0.3, 1.2);
    tl.to(q(".try"), { strokeDashoffset: 0, duration: 0.3, stagger: 0.18 }, b("never seen"))
      .to(q(".try"), { stroke: P.bad, opacity: 0, duration: 0.3, stagger: 0.18 }, b("never seen") + 0.35)
      .to(q(".huh"), { opacity: 1, duration: 0.2 }, b("never seen") + 1.0)
      .to(q(".bar53"), { scaleX: 1, duration: 0.7, ease: "power2.out", transformOrigin: "0% 50%" }, b("fifty-three"))
      .to(q(".v53"), { opacity: 1, duration: 0.2 }, b("fifty-three") + 0.5)
      .to(q(".bar33"), { scaleX: 1, duration: 0.6, ease: "power2.out", transformOrigin: "0% 50%" }, b("thirty-three"))
      .to(q(".v33"), { opacity: 1, duration: 0.2 }, b("thirty-three") + 0.4)
      .to(q(".h0, .huh"), { opacity: 0, duration: 0.2 }, b("Memory works best") - 0.3);
    fly(tl, q, "h1", [[100, 470], ST], b("Memory works best") - 0.2, 0.5);
    tl.to(q(".h1 .dots"), { opacity: 1, duration: 0.1 }, b("Memory works best") + 0.3)
      .to(q(".memory-g .tab")[2], { y: -10, duration: 0.2, ease: "back.out(3)" }, b("Memory works best") + 0.4);
    write(tl, q, "h1", b("on repeats"), 0.4);
    tl.to(q(".h1 .mark"), { opacity: 1, duration: 0.05 }, b("on repeats") + 0.5);
  });
  return (
    <div ref={ref} style={root}><Svg>
      <Stage meter={false} memFilled={6}>
        {[0, 1, 2, 3].map((i) => {
          const [tx, ty] = TAB(i);
          return <path key={i} className="try" d={`M ${ST[0] - 30} ${ST[1] - 40} Q ${(ST[0] + tx) / 2} ${ty - 90}, ${tx} ${ty}`} fill="none" stroke={P.memory} strokeWidth={2.5} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1} />;
        })}
        <text className="huh" x={ST[0] - 70} y={ST[1] - 160} fontFamily={HAND} fontSize={34} fontWeight={700} fill={P.bad} opacity={0}>?</text>
        <Card cls="h0" ink={P.student} shape="hex" dots={[6, 3, 8, 3, 7, 5]} label="new shape" />
        <Card cls="h1" ink={P.student} dots={[4, 5, 5, 8, 4, 6]} mark="ok" />
      </Stage>
      <rect x={740} y={24} width={410} height={160} rx={12} fill={P.paper} stroke={P.line} strokeWidth={2} />
      <text x={765} y={52} fontFamily={FONT} fontSize={16} fill={P.soft}>never-seen question types</text>
      <text x={765} y={98} fontFamily={FONT} fontSize={20} fontWeight={700} fill={P.ink}>Apprentice</text>
      <rect className="bar53" x={915} y={78} width={300 * 0.53} height={28} rx={4} fill={P.ink} stroke={P.ink} strokeWidth={2} />
      <text className="v53" x={1086} y={100} fontFamily={FONT} fontSize={24} fontWeight={800} fill={P.ink} opacity={0}>53%</text>
      <text x={765} y={150} fontFamily={FONT} fontSize={20} fontWeight={700} fill={P.ink}>student alone</text>
      <rect className="bar33" x={915} y={130} width={300 * 0.33} height={28} rx={4} fill={P.student} stroke={P.ink} strokeWidth={2} />
      <text className="v33" x={1026} y={152} fontFamily={FONT} fontSize={24} fontWeight={800} fill={P.ink} opacity={0}>33%</text>
    </Svg></div>
  );
};

/** Support bot: first refund question goes to the teacher (and memory), the next two stay local. */
export const UseCases: React.FC = () => {
  const b = useBeat();
  const ref = useGsap((tl, q) => {
    tl.set(q(".memory-g .tab")[4], { opacity: 0 }, 0);
    const t0 = b("support bot");
    const a = fly(tl, q, "u0", [APP_OUT, T], t0, 0.6);
    write(tl, q, "u0", a, 0.3);
    meter(tl, q, 0, UNIT, a + 0.3, 0.1);
    fly(tl, q, "u0", [T, M], a + 0.4, 0.5);
    tl.to(q(".u0"), { scale: 0.3, opacity: 0, duration: 0.3 }, a + 0.95).to(q(".memory-g .tab")[4], { opacity: 1, duration: 0.1 }, a + 1.2);
    ["u1", "u2"].forEach((c, i) => {
      const s = a + 1.2 + i * 0.9;
      const at = fly(tl, q, c, [APP_OUT, ST], s, 0.45);
      write(tl, q, c, at, 0.25);
      tl.to(q(`.${c} .mark`), { opacity: 1, duration: 0.05 }, at + 0.3);
      fly(tl, q, c, [ST, APP_OUT], at + 0.45, 0.45);
      tl.to(q(`.${c}`), { opacity: 0, duration: 0.1 }, at + 0.95);
    });
    tl.to(q(".mine"), { strokeDashoffset: 0, duration: 1.0 }, b("your data never leaves"))
      .from(q(".mine-l"), { opacity: 0, duration: 0.3 }, b("your data never leaves") + 0.6)
      .to(q(".teacher-g, .hosted"), { opacity: 0.3, duration: 0.6 }, b("your data never leaves") + 0.3);
  });
  return (
    <div ref={ref} style={root}><Svg>
      <Stage meter="$0.0000" memFilled={5} app={
        <App label="QuickBite support">
          <rect x={-70} y={-30} width={100} height={22} rx={11} fill={P.paper2} />
          <rect x={-30} y={4} width={100} height={22} rx={11} fill={P.student} opacity={0.25} />
          <rect x={-70} y={36} width={80} height={22} rx={11} fill={P.paper2} />
        </App>
      }>
        <rect className="mine" x={24} y={100} width={860} height={544} rx={18} fill="none" stroke={P.student} strokeWidth={2.5} strokeDasharray="1 1" pathLength={1} strokeDashoffset={1} />
        <text className="mine-l" x={48} y={130} fontFamily={HAND} fontSize={24} fontWeight={700} fill={P.student}>your machine</text>
        <Card cls="u0" ink={P.teacher} label="refund?" />
        <Card cls="u1" ink={P.student} label="refund?" mark="ok" />
        <Card cls="u2" ink={P.student} label="refund?" mark="ok" />
      </Stage>
    </Svg></div>
  );
};

/** Pull back: the whole system shrinks up; name, repo and licence lettered beneath. */
export const Outro: React.FC = () => {
  const ref = useGsap((tl, q) => {
    tl.to(q(".cam"), { scale: 0.55, x: 640 - 640 * 0.55, y: 30, duration: 1.0, ease: "power2.inOut", svgOrigin: "0 0" }, 0.1);
    const a = fly(tl, q, "o0", [APP_OUT, ST], 0.4, 0.5);
    write(tl, q, "o0", a, 0.25);
    const j = fly(tl, q, "o0", [ST, J], a + 0.3, 0.4);
    judge(tl, q, "o0", 0.94, j);
    fly(tl, q, "o0", [J, APP_OUT], j + 1.1, 0.5);
    tl.from(q(".name"), { opacity: 0, y: 12, duration: 0.5 }, 0.9)
      .from(q(".repo"), { opacity: 0, duration: 0.4 }, 1.5)
      .from(q(".lic"), { opacity: 0, duration: 0.4 }, 2.0);
  });
  return (
    <div ref={ref} style={root}><Svg>
      <Stage meter={false} memFilled={10}>
        <Card cls="o0" ink={P.student} mark="ok" />
      </Stage>
      <text className="name" x={640} y={500} textAnchor="middle" fontFamily={HAND} fontSize={58} fontWeight={700} fill={P.ink}>Apprentice</text>
      <text className="repo" x={640} y={552} textAnchor="middle" fontFamily="Consolas, monospace" fontSize={26} fill={P.ink}>github.com/Ayush-e4/apprentice</text>
      <text className="lic" x={640} y={592} textAnchor="middle" fontFamily={FONT} fontSize={20} fill={P.soft}>open source · open models · MIT</text>
      <line x1={0} y1={0} x2={0} y2={0} stroke={P.ink} strokeWidth={SW} />
    </Svg></div>
  );
};
