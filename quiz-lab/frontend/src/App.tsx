import { useEffect, useState } from "react";
import { Sidebar, type Page } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { Developer } from "./pages/Developer";
import { Plugins } from "./pages/Plugins";
import { Settings } from "./pages/Settings";
import { Simple } from "./pages/Simple";
import { useSettings } from "./state/lab";
import { useToasts } from "./state/toasts";

const PAGES: Page[] = ["simple", "dashboard", "plugins", "developer", "settings"];

function pageFromHash(): Page {
  const h = window.location.hash.replace("#/", "") as Page;
  return PAGES.includes(h) ? h : "simple";
}

export function App() {
  const settings = useSettings();
  const toasts = useToasts();
  const [page, setPage] = useState<Page>(pageFromHash);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = settings.theme;
    el.lang = settings.language;
    el.dir = settings.language === "he" ? "rtl" : "ltr";
  }, [settings.theme, settings.language]);

  const navigate = (p: Page) => {
    window.location.hash = `#/${p}`;
    setPage(p);
  };

  const current = page === "developer" && !settings.debugMode ? "dashboard" : page;

  return (
    <div className="app">
      <Sidebar page={current} onNavigate={navigate} />
      <main className="main">
        {current === "simple" && <Simple />}
        {current === "dashboard" && <Dashboard />}
        {current === "plugins" && <Plugins />}
        {current === "developer" && <Developer />}
        {current === "settings" && <Settings />}
      </main>
      <div className="toast-area">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
