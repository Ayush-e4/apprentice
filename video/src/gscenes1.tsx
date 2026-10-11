import gsap from "gsap";
import React from "react";
import { Card, Chars, Dot, KTitle, useGsap } from "./fx";
import { C, font } from "./ui";

const abs = (x: number, y: number, extra: React.CSSProperties = {}): React.CSSProperties => ({ position: "absolute", left: x, top: y, fontFamily: font, ...extra });
const full: React.CSSProperties = { position: "absolute", inset: 0 };

/** Counts a number up inside `el` (deterministic under seek). */
export const count = (tl: gsap.core.Timeline, el: Element[], from: number, to: number, at: number, dur: number, fmt: (v: number) => string) => {
  const o = { v: from };
  tl.to(o, { v: to, duration: dur, ease: "power2.out", onUpdate: () => el.forEach((e) => { e.textContent = fmt(o.v); }) }, at);
};

const Line: React.FC<{ className: string; x1: number; y1: number; x2: number; y2: number; color: string }> = ({ className, x1, y1, x2, y2, color }) => {
  const len = Math.hypot(x2 - x1, y2 - y1);
  return (
    <svg style={full} width={1280} height={720}>
      <line className={className} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={5} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len} />
    </svg>
  );
};
const draw = (tl: gsap.core.Timeline, q: (s: string) => Element[], cls: string, at: number) => tl.to(q(cls), { strokeDashoffset: 0, duration: 0.5, ease: "power2.inOut" }, at);
const pop = (tl: gsap.core.Timeline, q: (s: string) => Element[], cls: string, at: number) => tl.from(q(cls), { scale: 0, opacity: 0, duration: 0.6, ease: "back.out(2.2)" }, at);

const CHIPS = [["Today's sales?", 90, 230], ["Hi!", 330, 330], ["Refund status?", 120, 430], ["Top item in March?", 380, 520], ["Store timings?", 80, 600], ["Reset password", 420, 220]] as const;

export const Hook: React.FC = () => {
  const ref = useGsap((tl, q) => {
    tl.from(q(".l1 .ch"), { y: 40, opacity: 0, duration: 0.5, stagger: 0.02, ease: "power3.out" }, 0.2)
      .from(q(".easy"), { scale: 3, opacity: 0, duration: 0.6, ease: "expo.out" }, 0.9)
      .from(q(".chip"), { scale: 0, rotation: () => gsap.utils.random(-25, 25), opacity: 0, duration: 0.5, stagger: 0.09, ease: "back.out(2)" }, 1.2)
      .from(q(".big"), { x: 320, opacity: 0, duration: 0.7, ease: "power3.out" }, 2.6)
      .to(q(".chip"), { x: (i: number) => 1000 - CHIPS[i][1] - 60, y: (i: number) => 350 - CHIPS[i][2], scale: 0.2, opacity: 0, duration: 0.55, stagger: 0.12, ease: "power2.in" }, 3.1)
      .to(q(".big"), { x: "+=10", duration: 0.05, repeat: 13, yoyo: true }, 3.4)
      .from(q(".coin"), { y: 60, opacity: 0, duration: 0.35, stagger: 0.07, ease: "back.out(3)" }, 3.6)
      .to(q(".stage"), { scale: 0.82, opacity: 0.12, filter: "blur(6px)", duration: 0.5 }, 5.6)
      .from(q(".slam1"), { scale: 3.5, opacity: 0, duration: 0.45, ease: "expo.out" }, 5.8)
      .to(q(".slam1"), { x: "+=12", duration: 0.04, repeat: 7, yoyo: true }, 6.25)
      .from(q(".slam2 .ch"), { y: 40, rotationX: -90, opacity: 0, duration: 0.5, stagger: 0.025, ease: "back.out(2)" }, 7.2);
  });
  return (
    <div ref={ref} style={full}>
      <div className="stage" style={full}>
        <div style={abs(0, 80, { width: "100%", textAlign: "center", fontSize: 50, fontWeight: 800, color: C.text })}>
          <Chars className="l1" text="Most questions are " /><span className="easy" style={{ display: "inline-block", color: C.student }}>EASY</span>
        </div>
        {CHIPS.map(([t, x, y]) => (
          <div key={t} className="chip" style={abs(x, y, { padding: "10px 18px", borderRadius: 14, background: C.panel, border: `2px solid ${C.border}`, color: C.text, fontSize: 24 })}>{t}</div>
        ))}
        <Card className="big" x={820} y={230} w={360} h={240} color={C.teacher} title="BIG MODEL" sub="slow · expensive · every question" glow />
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="coin" style={abs(840 + (i % 6) * 56, 560 - Math.floor(i / 6) * 40, { width: 46, height: 30, borderRadius: 15, background: C.judge, color: "#3a2a00", fontWeight: 900, fontSize: 20, textAlign: "center", lineHeight: "30px", boxShadow: `0 0 14px ${C.judge}` })}>$</div>
        ))}
      </div>
      <div className="slam1" style={abs(0, 250, { width: "100%", textAlign: "center", fontSize: 84, fontWeight: 900, color: C.bad, textShadow: `0 0 40px ${C.bad}` })}>BIG-MODEL PRICES</div>
      <div style={abs(0, 370, { width: "100%", textAlign: "center", fontSize: 46, fontWeight: 700, color: C.text, perspective: 600 })}>
        <Chars className="slam2" text="for small-model work." />
      </div>
    </div>
  );
};

export const Intro: React.FC = () => {
  const ref = useGsap((tl, q) => {
    tl.from(q(".ring"), { scale: 0, opacity: 1, duration: 1.6, stagger: 0.25, ease: "power2.out" }, 0.1)
      .to(q(".ring"), { opacity: 0, duration: 0.8, stagger: 0.25 }, 1.1)
      .from(q(".logo .ch"), { y: -280, rotation: () => gsap.utils.random(-60, 60), opacity: 0, duration: 0.9, stagger: 0.05, ease: "bounce.out" }, 0.3)
      .fromTo(q(".sweep"), { x: -700 }, { x: 900, duration: 1.1, ease: "power2.inOut" }, 1.5)
      .from(q(".tag .ch"), { opacity: 0, y: 20, duration: 0.4, stagger: 0.015 }, 2.0)
      .from(q(".pill"), { scale: 0, opacity: 0, duration: 0.5, stagger: 1.1, ease: "back.out(2.5)" }, 3.4);
  });
  return (
    <div ref={ref} style={full}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="ring" style={abs(640 - 300, 260 - 300, { width: 600, height: 600, borderRadius: 300, border: `3px solid ${i === 1 ? C.teacher : C.student}` })} />
      ))}
      <div style={abs(0, 190, { width: "100%", textAlign: "center", fontSize: 128, fontWeight: 900, color: C.text, overflow: "hidden", letterSpacing: -2 })}>
        <span className="logo"><Chars text="Appr" /><Chars text="entice" style={{ color: C.student, textShadow: `0 0 30px ${C.student}` }} /></span>
        <div className="sweep" style={abs(0, 0, { width: 160, height: 200, background: "linear-gradient(90deg, transparent, #ffffff55, transparent)", transform: "skewX(-20deg)" })} />
      </div>
      <div style={abs(0, 370, { width: "100%", textAlign: "center", fontSize: 32, color: C.muted })}>
        <Chars className="tag" text="Small open models that learn from big open models" />
      </div>
      <div style={abs(0, 460, { width: "100%", display: "flex", justifyContent: "center", gap: 22 })}>
        {[["open-source gateway", C.accent], ["learns from big models", C.teacher], ["cheaper every day", C.student]].map(([t, c]) => (
          <div key={t} className="pill" style={{ padding: "10px 22px", borderRadius: 999, border: `2px solid ${c}`, color: c, fontSize: 24, fontWeight: 700, fontFamily: font, background: `${c}18` }}>{t}</div>
        ))}
      </div>
    </div>
  );
};

export const Idea: React.FC = () => {
  const ref = useGsap((tl, q) => {
    tl.from(q(".app"), { x: -260, opacity: 0, duration: 0.7, ease: "power3.out" }, 0.3);
    draw(tl, q, ".a1", 1.0).to(q(".p1"), { opacity: 1, duration: 0.1 }, 1.1).to(q(".p1"), { x: 440, duration: 0.8, ease: "power2.inOut" }, 1.2);
    tl.from(q(".gw"), { scale: 0, rotation: -10, opacity: 0, duration: 0.7, ease: "back.out(2)" }, 2.3);
    draw(tl, q, ".a2", 3.0).to(q(".p1"), { x: 880, duration: 0.8, ease: "power2.inOut" }, 3.2).to(q(".p1"), { opacity: 0, duration: 0.2 }, 4.0);
    tl.from(q(".stu"), { scale: 0, opacity: 0, duration: 0.8, ease: "elastic.out(1, 0.5)" }, 4.2)
      .to(q(".stu"), { scale: 1.05, duration: 0.5, repeat: 7, yoyo: true, ease: "sine.inOut" }, 5.0)
      .from(q(".b1"), { y: 30, opacity: 0, duration: 0.5, ease: "back.out(2)" }, 5.2)
      .from(q(".b2 .ch"), { opacity: 0, y: 14, duration: 0.3, stagger: 0.02 }, 6.6);
  });
  return (
    <div ref={ref} style={full}>
      <KTitle text="Step 1 · The student answers first" />
      <Card className="app" x={60} y={270} w={250} h={170} color={C.muted} title="Your app" sub="normal OpenAI request" />
      <Line className="a1" x1={320} y1={355} x2={470} y2={355} color={C.muted} />
      <Card className="gw" x={480} y={250} w={300} h={210} color={C.accent} title="Apprentice" sub="gateway" glow />
      <Line className="a2" x1={790} y1={355} x2={920} y2={355} color={C.student} />
      <Card className="stu" x={930} y={250} w={300} h={210} color={C.student} title="Student" sub="answers first" glow />
      <Dot className="p1" color={C.student} x={200} y={355} />
      <div className="b1" style={abs(930, 480, { width: 300, textAlign: "center", fontSize: 26, fontWeight: 800, color: C.student })}>Qwen3 · 1.7B params</div>
      <div style={abs(0, 560, { width: "100%", textAlign: "center", fontSize: 30, color: C.text })}><Chars className="b2" text="💻 runs on a laptop · free · private" /></div>
    </div>
  );
};

const Meter: React.FC<{ k: string; y: number; label: string; color: string }> = ({ k, y, label, color }) => (
  <div className={`row${k}`} style={abs(780, y, { width: 430 })}>
    <div style={{ color: C.muted, fontSize: 20 }}>{label}</div>
    <div style={{ height: 22, borderRadius: 11, background: C.panel, border: `2px solid ${C.border}`, overflow: "hidden", marginTop: 6 }}>
      <div className={`bar${k}`} style={{ width: "100%", height: "100%", background: color, transformOrigin: "left", transform: "scaleX(0)" }} />
    </div>
    <div style={{ color, fontSize: 28, fontWeight: 800, marginTop: 6 }}><span className={`num${k}`}>0.00</span> <span className={`mark${k}`} style={{ display: "inline-block" }}>{k === "A" ? "✓ send answer" : "✗ unsure, escalate"}</span></div>
  </div>
);

export const Judge: React.FC = () => {
  const ref = useGsap((tl, q) => {
    tl.from(q(".stu"), { x: -260, opacity: 0, duration: 0.6, ease: "power3.out" }, 0.3)
      .from(q(".kev"), { scale: 0, opacity: 0, duration: 0.7, ease: "back.out(2)" }, 0.9)
      .fromTo(q(".scan"), { y: 0 }, { y: 190, duration: 0.6, repeat: 3, yoyo: true, ease: "sine.inOut" }, 1.4)
      .from(q(".rowA"), { x: 80, opacity: 0, duration: 0.5 }, 2.3)
      .to(q(".barA"), { scaleX: 0.94, duration: 0.9, ease: "power2.out" }, 2.6)
      .from(q(".markA"), { scale: 0, opacity: 0, duration: 0.4, ease: "back.out(3)" }, 3.5)
      .from(q(".rowB"), { x: 80, opacity: 0, duration: 0.5 }, 4.0)
      .to(q(".barB"), { scaleX: 0.41, duration: 0.9, ease: "power2.out" }, 4.3)
      .from(q(".markB"), { scale: 0, opacity: 0, duration: 0.4, ease: "back.out(3)" }, 5.2)
      .to(q(".markB"), { x: "+=8", duration: 0.05, repeat: 7, yoyo: true }, 5.6)
      .from(q(".acc"), { y: 50, opacity: 0, duration: 0.6, ease: "power3.out" }, 6.3);
    count(tl, q(".numA"), 0, 0.94, 2.6, 0.9, (v) => v.toFixed(2));
    count(tl, q(".numB"), 0, 0.41, 4.3, 0.9, (v) => v.toFixed(2));
    count(tl, q(".accN"), 45.7, 99.3, 6.8, 2.2, (v) => `${v.toFixed(1)}%`);
  });
  return (
    <div ref={ref} style={full}>
      <KTitle text="Step 2 · A trained judge checks it" />
      <Card className="stu" x={50} y={220} w={250} h={170} color={C.student} title="Student" sub="draft answer" />
      <div className="kev" style={abs(380, 200, { width: 300, height: 210 })}>
        <Card className="kevc" x={0} y={0} w={300} h={210} color={C.judge} title="Kev judge" sub="0.8B · open · fine-tuned by us" glow />
        <div className="scan" style={abs(10, 8, { width: 280, height: 4, background: C.judge, boxShadow: `0 0 20px ${C.judge}` })} />
      </div>
      <Meter k="A" y={190} label="Answer A · confidence" color={C.student} />
      <Meter k="B" y={320} label="Answer B · confidence" color={C.bad} />
      <div className="acc" style={abs(0, 470, { width: "100%", textAlign: "center", fontSize: 36, color: C.text })}>
        Judge accuracy after fine-tuning: <span style={{ color: C.bad }}>45.7%</span> → <span className="accN" style={{ color: C.student, fontWeight: 900, fontSize: 52 }}>45.7%</span>
      </div>
    </div>
  );
};

export const Teacher: React.FC = () => {
  const ref = useGsap((tl, q) => {
    tl.from(q(".kev"), { x: -260, opacity: 0, duration: 0.6, ease: "power3.out" }, 0.3)
      .from(q(".unsure"), { scale: 0, opacity: 0, duration: 0.4, ease: "back.out(3)" }, 0.9)
      .to(q(".p"), { opacity: 1, duration: 0.1 }, 1.8)
      .to(q(".p"), { x: 240, y: -150, duration: 0.5, ease: "power2.out" }, 1.8)
      .to(q(".p"), { x: 480, y: 0, duration: 0.5, ease: "power2.in" }, 2.3)
      .to(q(".p"), { opacity: 0, duration: 0.1 }, 2.8)
      .from(q(".tch"), { rotationY: 90, scale: 0.4, opacity: 0, duration: 0.9, ease: "back.out(1.6)" }, 2.1)
      .from(q(".tname .ch"), { y: 30, opacity: 0, duration: 0.4, stagger: 0.03, ease: "back.out(2)" }, 3.9)
      .from(q(".ans"), { x: 160, opacity: 0, duration: 0.6, ease: "power3.out" }, 5.0)
      .from(q(".tick"), { scale: 0, rotation: -45, duration: 0.5, ease: "back.out(3)" }, 5.6);
  });
  return (
    <div ref={ref} style={{ ...full, perspective: 900 }}>
      <KTitle text="Step 3 · Unsure? Ask the teacher" />
      <Card className="kev" x={50} y={260} w={260} h={170} color={C.judge} title="Kev judge" sub="checked the answer" />
      <div className="unsure" style={abs(70, 450, { width: 220, textAlign: "center", color: C.bad, fontSize: 26, fontWeight: 800 })}>✗ not confident</div>
      <Dot className="p" color={C.teacher} x={320} y={345} size={28} />
      <Card className="tch" x={480} y={220} w={360} h={250} color={C.teacher} title="Teacher" sub="large open model" glow />
      <div style={abs(480, 490, { width: 360, textAlign: "center", fontSize: 30, fontWeight: 800, color: C.teacher })}><Chars className="tname" text="GLM-5.2" /></div>
      <div className="ans" style={abs(920, 280, { width: 300, height: 130, borderRadius: 18, background: C.panel, border: `3px solid ${C.student}`, color: C.text, fontSize: 26, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 })}>
        <span className="tick" style={{ display: "inline-block", color: C.student, fontSize: 48 }}>✓</span> correct answer
      </div>
    </div>
  );
};

export const Learn: React.FC = () => {
  const ref = useGsap((tl, q) => {
    tl.from(q(".tch"), { x: -260, opacity: 0, duration: 0.6, ease: "power3.out" }, 0.2)
      .from(q(".mem"), { scale: 0, opacity: 0, duration: 0.7, ease: "back.out(2)" }, 0.6)
      .fromTo(q(".note"), { x: 0, y: 0, opacity: 0, rotation: 0 }, { keyframes: [{ opacity: 1, duration: 0.1 }, { x: 420, y: 20, rotation: 20, duration: 0.6, ease: "power2.in" }, { opacity: 0, duration: 0.1 }], stagger: 0.28 }, 1.0)
      .from(q(".qq"), { y: -120, opacity: 0, duration: 0.6, ease: "bounce.out" }, 2.9)
      .from(q(".stu"), { x: 260, opacity: 0, duration: 0.6, ease: "power3.out" }, 3.4)
      .fromTo(q(".back"), { x: 0, opacity: 0 }, { keyframes: [{ opacity: 1, duration: 0.1 }, { x: 400, duration: 0.7, ease: "power2.inOut" }, { opacity: 0, duration: 0.1 }] }, 4.9)
      .to(q(".stuc"), { boxShadow: `0 0 90px ${C.student}`, duration: 0.3, repeat: 3, yoyo: true }, 5.7)
      .from(q(".win .ch"), { y: 40, rotationX: -90, opacity: 0, duration: 0.5, stagger: 0.02, ease: "back.out(2)" }, 6.0);
    count(tl, q(".cnt"), 0, 27, 1.0, 2.0, (v) => `${Math.round(v)}`);
  });
  return (
    <div ref={ref} style={full}>
      <KTitle text="Step 4 · The student learns" />
      <Card className="tch" x={40} y={200} w={260} h={170} color={C.teacher} title="Teacher" sub="correct answers" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="note" style={abs(220, 260, { width: 70, height: 50, borderRadius: 8, background: C.teacher, boxShadow: `0 0 18px ${C.teacher}`, opacity: 0 })} />
      ))}
      <div className="mem" style={abs(520, 170, { width: 270, height: 240, borderRadius: "50% / 16%", background: `${C.panel}ee`, border: `3px solid ${C.accent}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: `0 0 40px ${C.accent}55` })}>
        <div style={{ color: C.accent, fontSize: 30, fontWeight: 800 }}>Memory</div>
        <div className="cnt" style={{ color: C.text, fontSize: 64, fontWeight: 900 }}>0</div>
        <div style={{ color: C.muted, fontSize: 18 }}>teacher examples</div>
      </div>
      <div className="qq" style={abs(880, 110, { padding: "10px 18px", borderRadius: 14, background: C.panel, border: `2px solid ${C.judge}`, color: C.judge, fontSize: 24, fontWeight: 700 })}>Similar question?</div>
      <div className="stu" style={abs(930, 190, { width: 280, height: 190 })}><Card className="stuc" x={0} y={0} w={280} h={190} color={C.student} title="Student" sub="+ teacher's example" /></div>
      <div className="back" style={abs(700, 270, { width: 70, height: 50, borderRadius: 8, background: C.accent, boxShadow: `0 0 18px ${C.accent}`, opacity: 0 })} />
      <div style={abs(0, 470, { width: "100%", textAlign: "center", fontSize: 44, fontWeight: 800, color: C.student, perspective: 600 })}><Chars className="win" text="✓ Gets it right on its own" /></div>
    </div>
  );
};
