"""Applies the critic's MUST-FIX and SHOULD-FIX notes (round 1) to storyboard.json."""
import json
from pathlib import Path

path = Path(__file__).with_name("storyboard.json")
board = json.loads(path.read_text(encoding="utf-8"))
S = {s["id"]: s for s in board["scenes"]}

narr = {
    "cold-open-meter": "Your app sends every question to a big AI model. Most are easy. You pay big-model prices anyway.",
    "enter-apprentice": "What if a small model took the easy ones, and learned the hard ones? That's Apprentice: an open-source gateway that speaks the OpenAI API.",
    "broll-one-url": "Change one base URL, and your app never knows.",
    "student-desk": "First stop, the student: Kwen three, one point seven billion parameters, running on your machine through Ollama. Its answers cost nothing per token.",
    "judge-booth": "Small models slip up, so a judge checks every answer. Meet Kev, a tiny open model.",
    "broll-colab": "Fine-tuning on Colab took Kev from forty-six to ninety-nine percent accuracy.",
    "teacher-escalation": "Lower, and it escalates to the teacher: G L M five point two, a big open-weight model.",
    "broll-dashboard": "We ran eighty held-out text-to-S Q L questions.",
    "results-cost": "The student handled eighty-six percent of requests, and the bill was eighty-seven percent smaller than teacher-only.",
    "use-cases": "A support bot answering refund questions. When the student answers, your data never leaves your machine.",
}
for k, v in narr.items():
    S[k]["narration"] = v

for s in board["scenes"]:  # all four complex match-cuts become hard cuts
    if str(s.get("transition", "")).startswith(("match-cut", "wipe")):
        s["transition"] = "cut"

S["cold-open-meter"]["beats"][0] = "0.0-0.3 s music only; three request cards already sliding app -> teacher; the first one is lettered 'today's sales?'."
S["student-desk"]["onScreenText"] = ["Qwen3 1.7B", "Ollama", "local"]
S["student-desk"]["beats"] = ["card lands on the desk", "ink underline under the 'Qwen3 1.7B' sticker",
                              "'local' outline draws around desk", "green lines are written; corner meter stays still", "card returns to the app"]
S["enter-apprentice"]["beats"] = [b for b in S["enter-apprentice"]["beats"] if "socket" not in b and "slots" not in b] + [
    "final beat: the app's route detaches from the teacher and snaps to a small port on the box edge labelled 'OpenAI API'"]
S["teacher-escalation"]["onScreenText"] = ["0.41", "UNSURE", "GLM-5.2", "open weights", "hosted"]
S["results-accuracy"]["beats"] = ["lane 1: 20 green, 60 red outline -> 25%", "lane 2: 80 indigo -> 100%",
                                  "lane 3: 67 green, 11 indigo, 2 red outline -> 97.5% (78/80 correct)"]
S["results-cost"]["beats"][0] = "green (67) + red (2) squares = 69 handled by the student slide into one block: 86%; 11 indigo into a smaller block"
S["use-cases"]["onScreenText"] = ["QuickBite", "refund?", "your machine"]
S["outro"]["beats"][0] = "on 'Apprentice': the whole stage scales to 55% and moves up; one last card runs the loop and gets APPROVED"
S["broll-dashboard"]["broll"]["camera"] = "start below the KPI tiles at the 'Benchmark runs' heading; slow push-in to the first bar pairs"
S["broll-kirana"]["broll"]["camera"] = "push-in lands on the chip row 'Answered locally · judge 0.96 · cost $0 · remembered 3' and holds"
board["speed"] = 1.0
path.write_text(json.dumps(board, indent=2, ensure_ascii=False), encoding="utf-8")
print("words:", sum(len(s["narration"].split()) for s in board["scenes"]))
