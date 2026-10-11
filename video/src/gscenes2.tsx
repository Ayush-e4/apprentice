import gsap from "gsap";
import React from "react";
import { Chars, KTitle, useGsap } from "./fx";
import { count } from "./gscenes1";
import { C, font } from "./ui";

const abs = (x: number, y: number, extra: React.CSSProperties = {}): React.CSSProperties => ({ position: "absolute", left: x, top: y, fontFamily: font, ...extra });
const full: React.CSSProperties = { position: "absolute", inset: 0 };
const pct = (v: number) => `${v.toFixed(v > 97 && v < 98 ? 1 : 0)}%`;

/** Vertical bar of fixed height; GSAP grows it with scaleY. */
const Bar: React.FC<{ k: string; x: number; top: number; h: number; label: string; color: string; start: string }> = ({ k, x, top, h, label, color, start }) => (
  <div style={abs(x, top, { width: 150, height: 330 })}>
    <div className={`v${k}`} style={{ position: "absolute", bottom: 60 + h + 6, width: "100%", textAlign: "center", color, fontSize: 30, fontWeight: 900 }}>{start}</div>
    <div className={`b${k}`} style={{ position: "absolute", bottom: 60, left: 25, width: 100, height: h, borderRadius: "10px 10px 0 0", background: color, boxShadow: `0 0 24px ${color}66`, transformOrigin: "bottom", transform: "scaleY(0)" }} />
    <div className={`l${k}`} style={{ position: "absolute", bottom: 0, width: "100%", textAlign: "center", color: C.muted, fontSize: 18, lineHeight: 1.2 }}>{label}</div>
  </div>
);

const grow = (tl: gsap.core.Timeline, q: (s: string) => Element[], k: string, at: number) =>
  tl.to(q(`.b${k}`), { scaleY: 1, duration: 1, ease: "power3.out" }, at).from(q(`.v${k}, .l${k}`), { opacity: 0, y: 20, duration: 0.4 }, at);

const RING = 2 * Math.PI * 150;

export const Results: React.FC = () => {
  const ref = useGsap((tl, q) => {
    tl.from(q(".hdr"), { opacity: 0, y: 20, duration: 0.4 }, 0.3);
    grow(tl, q, "1", 2.3); count(tl, q(".v1"), 0, 25, 2.3, 1, pct);
    grow(tl, q, "2", 4.8); count(tl, q(".v2"), 0, 97.5, 4.8, 1.4, pct);
    tl.from(q(".ring"), { scale: 0.3, opacity: 0, duration: 0.7, ease: "back.out(1.8)" }, 8.4)
      .to(q(".arc"), { strokeDashoffset: RING * 0.14, duration: 1.4, ease: "power2.out" }, 8.6);
    count(tl, q(".share"), 0, 86, 8.6, 1.4, (v) => `${Math.round(v)}%`);
    grow(tl, q, "3", 11.2); count(tl, q(".v3"), 0, 0.126, 11.2, 1, (v) => `$${v.toFixed(3)}`);
    grow(tl, q, "4", 12.2); count(tl, q(".v4"), 0, 0.0165, 12.2, 1, (v) => `$${v.toFixed(4)}`);
    tl.from(q(".slam"), { scale: 2.6, opacity: 0, duration: 0.5, ease: "expo.out" }, 13.6)
      .to(q(".slam"), { y: "-=6", duration: 0.06, repeat: 5, yoyo: true }, 14.1);
  });
  return (
    <div ref={ref} style={full}>
      <KTitle text="80 held-out questions · measured" y={30} size={40} />
      <div className="hdr" style={abs(70, 105, { color: C.muted, fontSize: 22 })}>Accuracy</div>
      <div className="hdr" style={abs(450, 105, { color: C.muted, fontSize: 22 })}>Cost for 80 questions</div>
      <Bar k="1" x={50} top={140} h={60} label="Student alone" color={C.bad} start="0%" />
      <Bar k="2" x={210} top={140} h={234} label="Apprentice, after learning" color={C.student} start="0%" />
      <Bar k="3" x={430} top={140} h={234} label="Teacher only" color={C.teacher} start="$0" />
      <Bar k="4" x={590} top={140} h={31} label="Apprentice" color={C.student} start="$0" />
      <div className="ring" style={abs(860, 140, { width: 340, height: 340 })}>
        <svg width={340} height={340} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={170} cy={170} r={150} stroke={C.panel} strokeWidth={26} fill="none" />
          <circle className="arc" cx={170} cy={170} r={150} stroke={C.student} strokeWidth={26} fill="none" strokeLinecap="round" strokeDasharray={RING} strokeDashoffset={RING} style={{ filter: `drop-shadow(0 0 12px ${C.student})` }} />
        </svg>
        <div style={abs(0, 110, { width: 340, textAlign: "center" })}>
          <div className="share" style={{ color: C.student, fontSize: 66, fontWeight: 900 }}>0%</div>
          <div style={{ color: C.muted, fontSize: 20 }}>handled by the small model</div>
        </div>
      </div>
      <div className="slam" style={abs(0, 525, { width: "100%", textAlign: "center", fontSize: 44, fontWeight: 900, color: C.accent, textShadow: `0 0 30px ${C.accent}` })}>97.5% accurate · 87% cheaper</div>
    </div>
  );
};

export const Honest: React.FC = () => {
  const ref = useGsap((tl, q) => {
    grow(tl, q, "2", 2.4); count(tl, q(".v2"), 0, 53, 2.4, 1, pct);
    grow(tl, q, "1", 4.2); count(tl, q(".v1"), 0, 33, 4.2, 1, pct);
    tl.from(q(".note .ch"), { opacity: 0, y: 16, duration: 0.3, stagger: 0.015 }, 6.4);
  });
  return (
    <div ref={ref} style={full}>
      <KTitle text="Question types it has never seen" />
      <Bar k="1" x={400} top={130} h={90} label="Student alone" color={C.bad} start="0%" />
      <Bar k="2" x={730} top={130} h={145} label="Apprentice" color={C.student} start="0%" />
      <div style={abs(0, 500, { width: "100%", textAlign: "center", fontSize: 32, color: C.judge, fontWeight: 700 })}>
        <Chars className="note" text="Honest limit: the judge and the growing memory matter" />
      </div>
    </div>
  );
};

const CASES = [["📊", "Store analytics", "sales questions from shop owners", 2.4], ["💬", "Customer support", "repetitive questions, fast replies", 3.4], ["🛒", "Kirana orders", "typed in Hinglish", 4.5], ["🤖", "Coding agents", "dozens of easy calls per task", 5.7], ["🔒", "Private data", "most work stays on your machine", 6.8]] as const;

export const UseCases: React.FC = () => {
  const ref = useGsap((tl, q) => {
    q(".case").forEach((el, i) => {
      tl.from(el, { rotationY: -90, opacity: 0, x: -40, duration: 0.7, ease: "back.out(1.6)" }, CASES[i][3]);
      tl.from(el.querySelector(".ico")!, { scale: 0, rotation: -30, duration: 0.6, ease: "elastic.out(1, 0.4)" }, CASES[i][3] + 0.3);
    });
  });
  return (
    <div ref={ref} style={{ ...full, perspective: 1000 }}>
      <KTitle text="Anywhere questions repeat" />
      {CASES.map(([icon, title, sub], i) => {
        const row = Math.floor(i / 3);
        return (
          <div key={title} className="case" style={abs((row === 0 ? 70 : 270) + (i % 3) * 390, 150 + row * 225, { width: 350, height: 195, borderRadius: 20, background: `${C.panel}ee`, border: `2px solid ${C.border}`, padding: 22, boxShadow: "0 10px 40px #0008" })}>
            <div className="ico" style={{ fontSize: 50, display: "inline-block" }}>{icon}</div>
            <div style={{ color: C.text, fontSize: 30, fontWeight: 800, marginTop: 6 }}>{title}</div>
            <div style={{ color: C.muted, fontSize: 20, marginTop: 4 }}>{sub}</div>
          </div>
        );
      })}
    </div>
  );
};

const MODELS = [["Student", "Qwen3 1.7B", "Apache-2.0", C.student, 1.9], ["Teacher", "GLM-5.2", "MIT", C.teacher, 2.9], ["Judge", "Kev 0.8B · fine-tuned", "Apache-2.0", C.judge, 3.9], ["Memory", "nomic-embed-text", "Apache-2.0", C.accent, 4.6]] as const;

export const Open: React.FC = () => {
  const ref = useGsap((tl, q) => {
    q(".mrow").forEach((el, i) => tl.from(el, { x: 300, opacity: 0, skewX: -12, duration: 0.6, ease: "power4.out" }, MODELS[i][4]));
    tl.from(q(".stamp"), { scale: 3, rotation: 0, opacity: 0, duration: 0.45, ease: "expo.out" }, 5.4);
  });
  return (
    <div ref={ref} style={full}>
      <KTitle text="Every model is open weight" />
      {MODELS.map(([role, name, license, color], i) => (
        <div key={role} className="mrow" style={abs(140, 140 + i * 110, { width: 860, height: 92, borderRadius: 16, background: `${C.panel}ee`, border: `3px solid ${color}`, display: "flex", alignItems: "center", padding: "0 30px", gap: 24, boxShadow: `0 0 20px ${color}33` })}>
          <div style={{ color, fontSize: 26, fontWeight: 800, width: 130 }}>{role}</div>
          <div style={{ color: C.text, fontSize: 32, fontWeight: 800, flex: 1 }}>{name}</div>
          <div style={{ color: C.muted, fontSize: 24 }}>{license}</div>
        </div>
      ))}
      <div className="stamp" style={abs(930, 470, { padding: "12px 22px", border: `5px solid ${C.student}`, borderRadius: 14, color: C.student, fontSize: 34, fontWeight: 900, transform: "rotate(-12deg)", background: `${C.bg}cc` })}>100% OPEN</div>
    </div>
  );
};

const CODE = 'client = OpenAI(base_url="http://localhost:8000/v1")';

export const Use: React.FC = () => {
  const ref = useGsap((tl, q) => {
    tl.from(q(".term"), { y: 60, opacity: 0, duration: 0.5, ease: "power3.out" }, 0.1)
      .to(q(".code"), { text: CODE, duration: 2.0, ease: "none" }, 0.6)
      .from(q(".dash"), { scale: 0.6, opacity: 0, duration: 0.6, ease: "back.out(2)" }, 3.0)
      .fromTo(q(".fill"), { scaleX: 0.3 }, { scaleX: 0.86, duration: 2.0, ease: "power2.inOut" }, 3.4);
    count(tl, q(".pct"), 30, 86, 3.4, 2.0, (v) => `${Math.round(v)}%`);
  });
  return (
    <div ref={ref} style={full}>
      <KTitle text="One line to switch" />
      <div className="term" style={abs(110, 140, { width: 1060, borderRadius: 14, background: "#07090d", border: `2px solid ${C.border}`, overflow: "hidden", boxShadow: "0 20px 60px #000a" })}>
        <div style={{ height: 34, background: "#151922", display: "flex", alignItems: "center", gap: 8, paddingLeft: 14 }}>
          {[C.bad, C.judge, C.student].map((c) => <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c }} />)}
        </div>
        <div style={{ padding: "22px 28px", fontFamily: "Consolas, monospace", fontSize: 30, color: C.text, minHeight: 110 }}>
          <div style={{ color: C.muted, fontSize: 24 }}># any OpenAI SDK app</div>
          <span className="code" /><span style={{ color: C.student }}>▌</span>
        </div>
      </div>
      <div className="dash" style={abs(330, 380, { width: 620, padding: 24, borderRadius: 16, background: `${C.panel}ee`, border: `2px solid ${C.border}` })}>
        <div style={{ color: C.muted, fontSize: 20 }}>Dashboard · handled by the student</div>
        <div style={{ height: 30, borderRadius: 15, background: C.bg, marginTop: 14, overflow: "hidden" }}>
          <div className="fill" style={{ width: "100%", height: "100%", background: `linear-gradient(90deg, ${C.student}, #9dffcf)`, transformOrigin: "left" }} />
        </div>
        <div className="pct" style={{ color: C.student, fontSize: 46, fontWeight: 900, marginTop: 10 }}>30%</div>
      </div>
    </div>
  );
};

export const Close: React.FC = () => {
  const ref = useGsap((tl, q) => {
    tl.from(q(".logo .ch"), { x: () => gsap.utils.random(-500, 500), y: () => gsap.utils.random(-300, 300), rotation: () => gsap.utils.random(-180, 180), opacity: 0, filter: "blur(10px)", duration: 1.0, stagger: 0.03, ease: "power4.out" }, 0.1)
      .from(q(".flare"), { scale: 0, opacity: 1, duration: 1.4, ease: "power2.out" }, 0.9)
      .to(q(".flare"), { opacity: 0, duration: 0.6 }, 1.7)
      .from(q(".tag .ch"), { opacity: 0, y: 18, duration: 0.35, stagger: 0.015 }, 1.3)
      .from(q(".url"), { opacity: 0, y: 20, duration: 0.5 }, 3.0)
      .from(q(".evt"), { opacity: 0, scale: 0.8, duration: 0.5, ease: "back.out(2)" }, 3.5);
  });
  return (
    <div ref={ref} style={full}>
      <div className="flare" style={abs(340, 40, { width: 600, height: 600, borderRadius: 300, background: `radial-gradient(circle, ${C.student}66, transparent 65%)` })} />
      <div style={abs(0, 190, { width: "100%", textAlign: "center", fontSize: 120, fontWeight: 900, color: C.text, letterSpacing: -2 })}>
        <span className="logo"><Chars text="Appr" /><Chars text="entice" style={{ color: C.student, textShadow: `0 0 30px ${C.student}` }} /></span>
      </div>
      <div style={abs(0, 360, { width: "100%", textAlign: "center", fontSize: 34, color: C.muted })}><Chars className="tag" text="Small models that learn from big ones" /></div>
      <div className="url" style={abs(0, 440, { width: "100%", textAlign: "center", fontSize: 30, color: C.accent, fontWeight: 700 })}>github.com/Ayush-e4/apprentice</div>
      <div className="evt" style={abs(0, 500, { width: "100%", textAlign: "center", fontSize: 24, color: C.muted })}>Hacktoberfest 2026 · Mumbai · MIT licensed</div>
    </div>
  );
};
