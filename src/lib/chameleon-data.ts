// משחק "הזיקית" בציור — כל קטגוריה עם 16 מילים (כמו כרטיס המשחק המקורי).
// כולם רואים את המילה הסודית חוץ מהזיקית, שצריכה לצייר בלי להיחשף.

export interface Category {
  id: string;
  name: string;
  emoji: string;
  words: string[];
}

export const CATEGORIES: Category[] = [
  {
    id: "animals",
    name: "חיות",
    emoji: "🐘",
    words: ["פיל", "ג׳ירפה", "כלב", "חתול", "נחש", "דג", "ציפור", "קוף", "אריה", "צב", "ארנב", "פרה", "תמנון", "פינגווין", "עכביש", "סוס"],
  },
  {
    id: "food",
    name: "אוכל",
    emoji: "🍕",
    words: ["פיצה", "המבורגר", "גלידה", "בננה", "תפוח", "עוגה", "סושי", "פלאפל", "ביצה", "גזר", "אבטיח", "נקניקייה", "פופקורן", "שוקולד", "לחם", "ענבים"],
  },
  {
    id: "home",
    name: "דברים בבית",
    emoji: "🏠",
    words: ["מיטה", "כיסא", "שולחן", "מנורה", "טלוויזיה", "מקרר", "מספריים", "מטריה", "שעון", "מראה", "מפתח", "כרית", "מברשת שיניים", "ספה", "דלת", "חלון"],
  },
  {
    id: "transport",
    name: "תחבורה",
    emoji: "🚀",
    words: ["מכונית", "אוטובוס", "רכבת", "מטוס", "אופניים", "סירה", "רקטה", "מסוק", "אופנוע", "צוללת", "טרקטור", "קורקינט", "כדור פורח", "משאית", "סקייטבורד", "ספינה"],
  },
  {
    id: "nature",
    name: "טבע",
    emoji: "🌋",
    words: ["הר געש", "עץ", "פרח", "שמש", "ירח", "ענן", "ברק", "קשת", "גל", "מדבר", "אי", "מפל", "כוכב", "שלג", "עלה", "קקטוס"],
  },
  {
    id: "sports",
    name: "ספורט",
    emoji: "⚽",
    words: ["כדורגל", "כדורסל", "טניס", "שחייה", "באולינג", "גלישה", "סקי", "איגרוף", "גולף", "ריצה", "כדורעף", "קשתות", "רכיבה על סוסים", "התעמלות", "טיפוס", "הוקי"],
  },
  {
    id: "jobs",
    name: "מקצועות",
    emoji: "👩‍🚒",
    words: ["רופא", "כבאי", "שוטר", "טבח", "טייס", "מורה", "צייר", "אסטרונאוט", "דייג", "זמר", "נגר", "ספר", "חקלאי", "קוסם", "מתכנת", "בלש"],
  },
  {
    id: "tech",
    name: "מחשבים וטכנולוגיה",
    emoji: "💻",
    words: ["מחשב", "עכבר", "מקלדת", "רובוט", "טלפון", "משקפי VR", "שלט", "מצלמה", "אוזניות", "לוויין", "סוללה", "מדפסת", "ג׳ויסטיק", "רמקול", "נורה", "אנטנה"],
  },
  {
    id: "places",
    name: "מקומות",
    emoji: "🏰",
    words: ["טירה", "בית ספר", "בית חולים", "חוף ים", "ג׳ונגל", "קרקס", "ספרייה", "גן חיות", "מגדל אייפל", "פירמידות", "חלל", "בריכה", "מערה", "לונה פארק", "סופרמרקט", "קולנוע"],
  },
];

// צבע קבוע לכל שחקן — כדי שכולם יראו מי צייר מה
export const PLAYER_COLORS = [
  "#f43f5e", // rose
  "#38bdf8", // sky
  "#fbbf24", // amber
  "#34d399", // emerald
  "#a78bfa", // violet
  "#fb923c", // orange
  "#f472b6", // pink
  "#22d3ee", // cyan
  "#a3e635", // lime
  "#e2e8f0", // slate
];

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;

export function randomInt(n: number) {
  return Math.floor(Math.random() * n);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PLAYERS_KEY = "chameleon_players_v1";

export function loadPlayers(): string[] {
  try {
    const raw = localStorage.getItem(PLAYERS_KEY);
    const list = raw ? JSON.parse(raw) : null;
    if (Array.isArray(list) && list.every((x) => typeof x === "string")) return list.slice(0, MAX_PLAYERS);
  } catch {
    /* ignore */
  }
  return [];
}

export function savePlayers(players: string[]) {
  try {
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
  } catch {
    /* ignore */
  }
}
