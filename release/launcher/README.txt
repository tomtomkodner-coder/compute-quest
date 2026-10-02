Windows launcher for the game. Build: copy ../meccha-chameleon.html here as game.html, then
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w" -o MecchaChameleon.exe .
build_html.py rebuilds meccha-chameleon.html from the source (vite build + inline).
