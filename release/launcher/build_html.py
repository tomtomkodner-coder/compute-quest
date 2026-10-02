# builds the single-file preview: vite build (iife) + inline css/js + google fonts link from the route
import re, subprocess, os
R = "/home/user/compute-quest"
P = "/tmp/claude-0/-home-user-compute-quest/bc972495-63a4-5c7b-a8d6-ba8b8a5729b9/scratchpad/preview/meccha-chameleon.html"
subprocess.run("npx vite build --config .preview-tmp/vite.config.mjs", shell=True, cwd=R, check=True, stdout=subprocess.DEVNULL)
ver = int(subprocess.run("git rev-list --count HEAD", shell=True, cwd=R, capture_output=True, text=True).stdout.strip() or 0)
fonts = re.search(r'fonts\.googleapis\.com/css2[^"]*', open(f"{R}/src/routes/chameleon.tsx").read()).group(0)
css = open(f"{R}/.preview-tmp/dist/tanstack_start_ts.css").read()
js = open(f"{R}/.preview-tmp/dist/app.js").read().replace("</script", "<\\/script")
html = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Meccha Chameleon</title>
<meta name="mc-version" content="{ver}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://{fonts}">
<style>{css}</style></head><body style="margin:0;background:#000">
<div id="app" dir="ltr"></div>
<script>{js}
</script></body></html>'''
open(P, "w").write(html)
print("preview", len(html))
