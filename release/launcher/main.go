// MECCHA CHAMELEON (web remake) — Windows launcher.
// Serves the game locally and opens it in the default browser. The in-game "Update" button calls /__update:
// the launcher downloads the newest game from UPDATE_URL (or update_url.txt next to the exe), keeps it in
// %LOCALAPPDATA%\MecchaChameleon, and the page reloads — no new exe needed.
package main

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"time"
)

//go:embed game.html
var embedded []byte

const defaultUpdateURL = "https://raw.githubusercontent.com/tomtomkodner-coder/compute-quest/claude/drawing-game-similar-yo90c6/release/meccha-chameleon.html"

var verRe = regexp.MustCompile(`<meta name="mc-version" content="(\d+)"`)

func version(b []byte) int {
	m := verRe.FindSubmatch(b)
	if m == nil {
		return 0
	}
	v, _ := strconv.Atoi(string(m[1]))
	return v
}

func cachePath() string {
	d, err := os.UserCacheDir()
	if err != nil {
		d = "."
	}
	d = filepath.Join(d, "MecchaChameleon")
	os.MkdirAll(d, 0o755)
	return filepath.Join(d, "game.html")
}

func current() []byte {
	if b, err := os.ReadFile(cachePath()); err == nil && version(b) > version(embedded) {
		return b
	}
	return embedded
}

func updateURL() string {
	exe, _ := os.Executable()
	if b, err := os.ReadFile(filepath.Join(filepath.Dir(exe), "update_url.txt")); err == nil && strings.TrimSpace(string(b)) != "" {
		return strings.TrimSpace(string(b))
	}
	return defaultUpdateURL
}

func main() {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		panic(err)
	}
	url := fmt.Sprintf("http://%s/", ln.Addr().String())
	http.HandleFunc("/__launcher", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]any{"launcher": true, "version": version(current())})
	})
	http.HandleFunc("/__update", func(w http.ResponseWriter, r *http.Request) {
		res := map[string]any{"version": version(current())}
		c := http.Client{Timeout: 60 * time.Second}
		resp, err := c.Get(updateURL())
		if err == nil && resp.StatusCode == 200 {
			b, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			if nv := version(b); nv > version(current()) {
				if os.WriteFile(cachePath(), b, 0o644) == nil {
					res["updated"], res["version"] = true, nv
				}
			} else {
				res["latest"] = true
			}
		} else {
			res["error"] = "no connection to the update server"
		}
		json.NewEncoder(w).Encode(res)
	})
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		w.Write(current())
	})
	fmt.Println("MECCHA CHAMELEON is running at", url, "- keep this window open while playing.")
	if runtime.GOOS == "windows" {
		exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	} else {
		exec.Command("xdg-open", url).Start()
	}
	http.Serve(ln, nil)
}
