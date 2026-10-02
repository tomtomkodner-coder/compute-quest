# builds src/game/meccha/thumbs.ts from scratchpad/shots/<map>/preview.png (pre-rendered lobby map pictures)
import base64, io, os, sys
from PIL import Image
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ids = ["mansion","country","sewer","backrooms","penguin","sugarland","osaka","egypt","deathburger","greece","deepsea","mall","kyoto","museum","gallery","coldstorage","brickloft","pool","sakura","meeting","school","amusement","onsen"]
out = {}
for i in ids:
    f = f"{S}/shots/{i}/preview.png"
    if not os.path.exists(f): continue
    im = Image.open(f).convert("RGB"); im.thumbnail((384, 240), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "JPEG", quality=76); out[i] = base64.b64encode(b.getvalue()).decode()
src = "// צילומי המפות ללובי — מוכנים מראש (לא בונים 20 מפות בזמן ריצה). נוצר ע\"י tools/gen_thumbs.py\n"
src += "export const THUMBS: Record<string, string> = {\n" + "".join(f'  {k}: "data:image/jpeg;base64,{v}",\n' for k, v in out.items()) + "};\n"
open("/home/user/compute-quest/src/game/meccha/thumbs.ts", "w").write(src)
print(sorted(out), sum(len(v) for v in out.values()))
