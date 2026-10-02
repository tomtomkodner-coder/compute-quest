import json, re
L12 = ["he","ja","zh","zht","pt","es","fr","ko","ar","it","de","ru"]
L11 = L12[1:]
entries = {}
def load(fn, langs):
    for line in open(fn, encoding="utf8"):
        line = line.rstrip("\n")
        if not line.strip(): continue
        parts = [p.replace("\\n", "\n") for p in line.split("\t")]
        assert len(parts) == len(langs) + 1, (fn, parts[0], len(parts))
        k = parts[0]
        d = entries.setdefault(k, {})
        for l, v in zip(langs, parts[1:]):
            # placeholders must be preserved
            for ph in re.findall(r"\{[a-z]+\}", k): assert ph in v, (k, l, v)
            d[l] = v
load("he_only.txt", ["he"])
load("eleven.txt", L11)
for f in ["all_ui.txt", "rooms1.txt", "rooms2.txt"]: load(f, L12)
need = json.load(open("need.json"))
miss = [(k, [l for l in ls if l not in entries.get(k, {})]) for k, ls in need.items()]
miss = [m for m in miss if m[1]]
print("uncovered:", miss)
out = ["// UI strings localized after the full-coverage audit (menus, HUD, area names, poses, errors).",
       "const EXTRA2: Record<string, Partial<Record<L | \"he\", string>>> = {"]
for k, d in entries.items():
    body = ", ".join(f"{l}: {json.dumps(d[l], ensure_ascii=False)}" for l in L12 if l in d)
    out.append(f"  {json.dumps(k, ensure_ascii=False)}: {{ {body} }},")
out.append("};")
open("extra2.ts.txt", "w").write("\n".join(out) + "\n")
print(len(entries), "keys")
