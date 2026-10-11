"""Applies critic round-2 fixes to the v2 scene code. Each replacement must match exactly once."""
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "src" / "v2"


def patch(name: str, pairs: list[tuple[str, str]]) -> None:
    p = SRC / name
    text = p.read_text(encoding="utf-8")
    for old, new in pairs:
        n = text.count(old)
        assert n == 1, f"{name}: expected 1 match, found {n}: {old[:70]!r}"
        text = text.replace(old, new)
    p.write_text(text, encoding="utf-8")
    print(f"{name}: {len(pairs)} edits")


patch("world.tsx", [
    ('tl.to(q(`.${cls} .ink`), { scaleX: 1, duration: dur, ease: "none", transformOrigin: "-44px 0px" }, at);',
     'tl.to(q(`.${cls} .ink path`), { strokeDashoffset: 0, duration: dur / 3, stagger: dur / 3, ease: "none" }, at);'),
    ('    <text className="meter-val" x={0} y={11}',
     '    <text x={0} y={-44} textAnchor="middle" fontFamily={FONT} fontSize={14} fill={P.soft}>API bill</text>\n    <text className="meter-val" x={0} y={11}'),
])
patch("s1.tsx", [
    ('tl.set(q(".v0 .ink"), { scaleX: 1 }, 0)', 'tl.set(q(".v0 .ink path"), { strokeDashoffset: 0 }, 0)'),
    ('tl.set(q(".x0 .ink"), { scaleX: 1 }, 0)', 'tl.set(q(".x0 .ink path"), { strokeDashoffset: 0 }, 0)'),
])
patch("s2.tsx", [
    ('.set(q(".m0 .ink, .m1 .ink"), { scaleX: 1 }, 0)', '.set(q(".m0 .ink path, .m1 .ink path"), { strokeDashoffset: 0 }, 0)'),
    ('.set(q(".r1 .ink"), { scaleX: 1 }, b("worked example"))', '.set(q(".r1 .ink path"), { strokeDashoffset: 0 }, b("worked example"))'),
    # honest-limit: results card into the empty top-right; green = student everywhere
    ('<rect x={820} y={210} width={420} height={250} rx={12} fill={P.paper} stroke={P.line} strokeWidth={2} />',
     '<rect x={740} y={24} width={410} height={160} rx={12} fill={P.paper} stroke={P.line} strokeWidth={2} />'),
    ('<text x={845} y={250} fontFamily={FONT} fontSize={18} fill={P.soft}>never-seen question types</text>',
     '<text x={765} y={52} fontFamily={FONT} fontSize={16} fill={P.soft}>never-seen question types</text>'),
    ('<text x={845} y={300} fontFamily={FONT} fontSize={20} fontWeight={700} fill={P.ink}>Apprentice</text>',
     '<text x={765} y={98} fontFamily={FONT} fontSize={20} fontWeight={700} fill={P.ink}>Apprentice</text>'),
    ('<rect className="bar53" x={845} y={312} width={300 * 0.53} height={30} rx={4} fill={P.student} stroke={P.ink} strokeWidth={2} />',
     '<rect className="bar53" x={915} y={78} width={300 * 0.53} height={28} rx={4} fill={P.ink} stroke={P.ink} strokeWidth={2} />'),
    ('<text className="v53" x={845 + 159 + 12} y={335}', '<text className="v53" x={1086} y={100}'),
    ('<text x={845} y={392} fontFamily={FONT} fontSize={20} fontWeight={700} fill={P.ink}>student alone</text>',
     '<text x={765} y={150} fontFamily={FONT} fontSize={20} fontWeight={700} fill={P.ink}>student alone</text>'),
    ('<rect className="bar33" x={845} y={404} width={300 * 0.33} height={30} rx={4} fill={P.line} stroke={P.ink} strokeWidth={2} />',
     '<rect className="bar33" x={915} y={130} width={300 * 0.33} height={28} rx={4} fill={P.student} stroke={P.ink} strokeWidth={2} />'),
    ('<text className="v33" x={845 + 99 + 12} y={427}', '<text className="v33" x={1026} y={152}'),
    # use-cases: "your machine" encloses the app and the whole Apprentice box, stops before the hosted line
    ('<rect className="mine" x={30} y={180} width={865} height={460}', '<rect className="mine" x={24} y={100} width={860} height={544}'),
    ('<text className="mine-l" x={60} y={210}', '<text className="mine-l" x={48} y={130}'),
    # flywheel: a teacher-only counter beside the real meter so "the bill shrinks" is visible
    ('      if (d === "T") {', '      meter(tl, q, (k + 1) * UNIT, (k + 2) * UNIT, t + 0.32, 0.1, 4, ".ghost-val");\n      if (d === "T") {'),
    ('      <text x={300} y={668} fontFamily={FONT} fontSize={18} fontWeight={700} fill={P.student}>student</text>',
     '      <text x={1150} y={124} textAnchor="middle" fontFamily={FONT} fontSize={18} fill={P.soft}>teacher-only <tspan className="ghost-val">$0.0016</tspan></text>\n'
     '      <text x={300} y={668} fontFamily={FONT} fontSize={18} fontWeight={700} fill={P.student}>student</text>'),
])
patch("s3.tsx", [
    ('.to(q(".k0 .ink"), { scaleX: 1, duration: 0.6, ease: "none", transformOrigin: "-44px 0px" }, a + 0.3);',
     '.to(q(".k0 .ink path"), { strokeDashoffset: 0, duration: 0.2, stagger: 0.2, ease: "none" }, a + 0.3);'),
    # real-example: bubbles up top, side by side, clear of the box label and the app
    ('<rect x={40} y={120} width={560} height={56} rx={14} fill="#fff" stroke={P.ink} strokeWidth={2.5} />',
     '<rect x={40} y={30} width={560} height={56} rx={14} fill="#fff" stroke={P.ink} strokeWidth={2.5} />'),
    ('<text x={60} y={155} fontFamily={FONT} fontSize={20} fill={P.ink}>March 2026',
     '<text x={60} y={65} fontFamily={FONT} fontSize={20} fill={P.ink}>March 2026'),
    ('<rect x={40} y={190} width={420} height={56} rx={14} fill={P.student} stroke={P.ink} strokeWidth={2.5} />',
     '<rect x={620} y={30} width={420} height={56} rx={14} fill={P.student} stroke={P.ink} strokeWidth={2.5} />'),
    ('<text x={60} y={225} fontFamily={FONT} fontSize={22} fontWeight={700} fill="#fff">Bandra',
     '<text x={640} y={65} fontFamily={FONT} fontSize={22} fontWeight={700} fill="#fff">Bandra'),
    # results: scattered (not striped) 25% lane; consistent units in the cost labels
    ('kinds: Array.from({ length: 80 }, (_, i) => (i % 4 === 0 ? "s" : "x"))', 'kinds: Array.from({ length: 80 }, (_, i) => ((i * 37) % 80 < 20 ? "s" : "x"))'),
    ('fill={P.student}>86% student</text>', 'fill={P.student}>69 by student · 86%</text>'),
    ('fill={P.teacher}>11 to teacher</text>', 'fill={P.teacher}>11 by teacher · 14%</text>'),
    # test bench: less empty space
    ('{Array.from({ length: 6 }).map((_, i) => <rect key={i} x={90 + i * 3}', '<g transform="translate(-128 -72) scale(1.2)">\n      {Array.from({ length: 6 }).map((_, i) => <rect key={i} x={250 + i * 3}'),
    ('<text x={140} y={430} textAnchor="middle" fontFamily={FONT} fontSize={20} fontWeight={700} fill={P.ink}>80 questions</text>',
     '<text x={300} y={430} textAnchor="middle" fontFamily={FONT} fontSize={20} fontWeight={700} fill={P.ink}>80 questions</text>'),
    ('fill={P.soft}>text-to-SQL on a shop database</text>', 'fill={P.soft}>text-to-SQL on a shop database</text>\n      </g>'),
    ('{ x: (i: number) => 140 - cell(i, 430, 270)[0]', '{ x: (i: number) => 300 - cell(i, 430, 270)[0]'),
])
patch("cast.tsx", [
    ('fontWeight={800} fontSize={20} fill={P.judge} />', 'fontWeight={800} fontSize={20} fill={P.ink} />\n        <text x={50} y={-36} fontFamily={FONT} fontSize={15} fontWeight={700} fill={P.ink}>0.8</text>'),
])
