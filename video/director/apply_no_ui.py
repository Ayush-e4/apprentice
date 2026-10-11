"""Round 2: the web UI is being rebuilt, so replace app-screen B-roll with animated scenes."""
import json
from pathlib import Path

path = Path(__file__).with_name("storyboard.json")
board = json.loads(path.read_text(encoding="utf-8"))
S = {s["id"]: s for s in board["scenes"]}
order = [s["id"] for s in board["scenes"]]

bench = S.pop("broll-dashboard")
bench.update({
    "id": "test-bench", "type": "anim", "broll": None,
    "narration": "We tested it on eighty held-out text-to-S Q L questions.",
    "visual": "A stack of 80 small question cards on the left feeds into the full stage; a tally board above the stage counts answered questions.",
    "beats": ["cards fan out from the stack into a 10x8 grid of small squares", "on 'held-out': a dashed line separates them from the memory cabinet (never seen in training)"],
    "onScreenText": ["80 questions", "held-out"], "minSeconds": 4.5,
})
real = S.pop("broll-kirana")
real.update({
    "id": "real-example", "type": "anim", "broll": None,
    "narration": "Real questions repeat. A shop owner asks, in Hinglish, which store had the most orders. The student answers alone, for free.",
    "visual": "Stage; the app is a shop counter chat. A card lettered 'March 2026 mein sabse zyada orders kis store pe aaye?' goes to the student; answer card 'Bandra Linking Road · 65 orders'; judge 0.96 APPROVED; meter stays $0.0000.",
    "beats": ["question card travels to the student", "student writes; memory tab lifts (remembered 3)", "judge needle 0.96, APPROVED", "answer returns: 'Bandra Linking Road · 65 orders'"],
    "onScreenText": ["Bandra Linking Road", "65 orders", "0.96", "$0.0000"], "minSeconds": 8.5,
})
board["scenes"] = [
    bench if sid == "broll-dashboard" else real if sid == "broll-kirana" else S[sid]
    for sid in order
]
for sid, secs in {"outro": 5.0, "memory-file": 3.8, "flywheel": 4.8, "broll-one-url": 4.0}.items():
    next(s for s in board["scenes"] if s["id"] == sid)["minSeconds"] = secs
path.write_text(json.dumps(board, indent=2, ensure_ascii=False), encoding="utf-8")
print([s["id"] for s in board["scenes"]])
print("words:", sum(len(s["narration"].split()) for s in board["scenes"]))
