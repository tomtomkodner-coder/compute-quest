import re, json, sys
R = "/home/user/compute-quest/src/"
files = ["components/MecchaMenu.tsx", "components/MecchaGame.tsx", "game/meccha/engine.ts", "game/meccha/net.ts"]
cands = {}
lit = re.compile(r'"((?:[^"\\\n]|\\.)*)"')
cls = re.compile(r'^(?:[a-z0-9!:\[\]\-_./%#(),]+\s*)+$')
for f in files:
    src = open(R + f).read()
    for i, line in enumerate(src.split("\n"), 1):
        s = line.strip()
        if s.startswith("//") or s.startswith("import") or s.startswith("*"): continue
        for m in lit.finditer(line):
            v = m.group(1)
            if not re.search(r"[A-Za-z]{2,}", v): continue
            if v.startswith("#") or v.startswith("/") or v.startswith("@") or "://" in v: continue
            if cls.match(v) and not re.search(r"[A-Z]", v): continue  # css classes / ids
            cands.setdefault(v, f"{f}:{i}")
json.dump(cands, open("cands.json", "w"), ensure_ascii=False, indent=0)
print(len(cands))
