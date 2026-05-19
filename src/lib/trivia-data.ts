// כל השאלות מבוססות על נושאי עבודת החקר:
// Z1 וקונראד צוזה, ENIAC, התפתחות המחשבים, משחקי מחשב פעם והיום, VR והמסקנה.
// אין שאלות מטא ("מי כתב את העבודה" וכד'), רק מידע מעניין מהתוכן.

export interface Question {
  q: string;
  options: string[];
  correct: number;
  explanation: string; // בוקס הסבר שמופיע אחרי כל תשובה
  hard?: boolean;      // שאלה קשה = ניקוד כפול
}

export const QUESTIONS: Question[] = [
  {
    q: "מי בנה את המחשב הראשון בעולם, ה־Z1?",
    options: ["אלן טיורינג", "קונראד צוזה", "ביל גייטס", "סטיב ג׳ובס"],
    correct: 1,
    explanation:
      "המהנדס הגרמני קונראד צוזה (Konrad Zuse) בנה את ה־Z1 בבית הוריו בברלין. הוא נחשב לחלוץ עולם המחשוב.",
  },
  {
    q: "באיזו שיטת ספירה השתמש ה־Z1?",
    options: ["עשרונית", "בינארית (0 ו־1)", "הקסדצימלית", "רומית"],
    correct: 1,
    explanation:
      "ה־Z1 היה מהמכונות הראשונות שעבדו בשיטה בינארית — כל המידע יוצג כאפסים ואחדים, בדיוק כמו במחשבים של היום.",
  },
  {
    q: "באיזו תקופה בערך נבנה ה־Z1?",
    options: ["שנות ה־1880", "סוף שנות ה־1930", "שנות ה־1960", "שנות ה־1990"],
    correct: 1,
    explanation:
      "ה־Z1 נבנה בין השנים 1936–1938, לפני פרוץ מלחמת העולם השנייה. זה אומר שהמחשב הראשון בן כמעט 90 שנה!",
  },
  {
    q: "ממה היה בנוי בעיקר ה־Z1?",
    options: [
      "טרנזיסטורים",
      "חלקים מכניים נעים (לוחיות מתכת)",
      "שבבי סיליקון",
      "כרטיסים מנוקבים בלבד",
    ],
    correct: 1,
    explanation:
      "ה־Z1 היה מחשב מכני — אלפי לוחיות מתכת דקות שזזו אחת מול השנייה. בגלל זה הוא היה גם איטי וגם נטה להיתקע.",
    hard: true,
  },
  {
    q: "איפה צוזה בנה את ה־Z1?",
    options: ["במפעל ענק", "בסלון של בית הוריו בברלין", "באוניברסיטה באמריקה", "בצוללת"],
    correct: 1,
    explanation:
      "צוזה בנה את המחשב הראשון בסלון של בית הוריו, כפרויקט אישי, בלי תקציב גדול ובלי צוות.",
    hard: true,
  },
  {
    q: "מה קרה למחשב ה־Z1 המקורי?",
    options: [
      "נמצא שלם במוזיאון",
      "נהרס בהפצצה במלחמת העולם השנייה",
      "נמכר לארה״ב",
      "עדיין פועל היום",
    ],
    correct: 1,
    explanation:
      "ה־Z1 המקורי נהרס בהפצצה בברלין ב־1943. צוזה בנה לו שחזור הרבה שנים אחר־כך, והוא מוצג היום במוזיאון בברלין.",
    hard: true,
  },
  {
    q: "מהו ה־ENIAC?",
    options: [
      "משחק מחשב מהשנים האחרונות",
      "מחשב אלקטרוני ענק שנבנה בארה״ב",
      "שפת תכנות",
      "חברת מחשבים",
    ],
    correct: 1,
    explanation:
      "ה־ENIAC היה אחד המחשבים האלקטרוניים הראשונים בעולם, נבנה בארה״ב באמצע שנות ה־40, ושימש בעיקר לחישובים צבאיים.",
  },
  {
    q: "בערך כמה שקל ה־ENIAC?",
    options: ["10 קילו", "100 קילו", "כ־30 טון", "חצי טון"],
    correct: 2,
    explanation:
      "ה־ENIAC שקל כ־30 טון ותפס חדר שלם. מחשב נייד היום שוקל פחות מ־2 קילו ועוצמתי ממנו פי מיליונים.",
    hard: true,
  },
  {
    q: "מה ההבדל המרכזי בין מחשבי פעם למחשבי היום?",
    options: [
      "פעם היו זולים יותר",
      "פעם היו ענקיים ואיטיים, היום קטנים ומהירים בהרבה",
      "אין הבדל אמיתי",
      "פעם היו צבעוניים יותר",
    ],
    correct: 1,
    explanation:
      "המחשבים הראשונים מילאו חדרים שלמים, ביצעו פעולה אחת בשנייה והיו רגישים מאוד. היום סמארטפון בכיס מבצע מיליארדי פעולות בשנייה.",
  },
  {
    q: "מה היו צריכים לעשות פעם כדי לשנות תוכנית במחשב?",
    options: [
      "להוריד אפליקציה",
      "לחבר מחדש כבלים ומתגים ידנית",
      "ללחוץ כפתור אחד",
      "לדבר עם המחשב",
    ],
    correct: 1,
    explanation:
      "במחשבים הראשונים תכנות נעשה ע״י חיבור פיזי של כבלים והעברת מתגים. תהליך אחד יכול היה לקחת ימים שלמים.",
    hard: true,
  },
  {
    q: "מה הייתה אחת מהמטרות העיקריות של המחשבים הראשונים?",
    options: [
      "לשחק משחקי וידאו",
      "לבצע חישובים מתמטיים מורכבים",
      "לשלוח אימיילים",
      "לערוך תמונות",
    ],
    correct: 1,
    explanation:
      "המחשבים הראשונים נבנו כדי לפתור חישובים שלקחו לבני אדם שבועות — חישובים מדעיים, הנדסיים וצבאיים.",
  },
  {
    q: "מה מציגות האותיות VR?",
    options: [
      "Video Recording",
      "Virtual Reality – מציאות מדומה",
      "Very Real",
      "Visual Range",
    ],
    correct: 1,
    explanation:
      "VR = Virtual Reality, מציאות מדומה. עם משקפי VR השחקן מרגיש שהוא ממש בתוך עולם המשחק.",
  },
  {
    q: "באילו טכנולוגיות משתמשים משחקי מחשב היום כדי ליצור דמויות ועולמות?",
    options: [
      "נייר ועיפרון בלבד",
      "תוכנות, גרפיקה ובינה מלאכותית",
      "רק שחקנים אמיתיים",
      "רק מצלמות",
    ],
    correct: 1,
    explanation:
      "משחקי הווידאו של היום משלבים תוכנות גרפיקה תלת־ממדית, מנועי משחק (Game Engines) ובינה מלאכותית כדי להזיז דמויות ולקבל החלטות.",
  },
  {
    q: "איך נראו המשחקים הראשונים על המחשבים?",
    options: [
      "תלת־ממד מציאותי",
      "פיקסלים פשוטים בשחור־לבן או בכמה צבעים",
      "VR מלא",
      "כמו סרטי קולנוע",
    ],
    correct: 1,
    explanation:
      "המשחקים הראשונים (כמו Pong) היו פשוטים מאוד — כמה פיקסלים על מסך, בלי גרפיקה מציאותית ובלי סאונד מורכב.",
  },
  {
    q: "מהי המסקנה המרכזית שעולה מהשוואת מחשבי פעם להיום?",
    options: [
      "המחשבים הפסיקו להתפתח",
      "מהמחשב הראשון ועד היום עברנו דרך עצומה — הכל קטן, חזק ומהיר בהרבה",
      "פעם המחשבים היו טובים יותר",
      "אין קשר בין המחשבים אז להיום",
    ],
    correct: 1,
    explanation:
      "מ־Z1 המכני בסלון של צוזה ועד לסמארטפון וה־VR של היום — תוך פחות ממאה שנה המחשבים השתנו מקצה לקצה, וזה רק ימשיך להתפתח.",
  },
  {
    q: "כמה זמן בערך לקח חישוב שהיום נעשה במחשב בשנייה, על המחשבים הראשונים?",
    options: ["פחות משנייה", "כמה דקות עד שעות שלמות", "אותו זמן בדיוק", "שנים"],
    correct: 1,
    explanation:
      "פעולות שמחשב היום מסיים בשבריר שנייה יכלו לקחת למחשב הראשון דקות, שעות ולפעמים אפילו ימים שלמים של עבודה רציפה.",
    hard: true,
  },
];

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface PreparedQuestion {
  q: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hard: boolean;
}

let lastFirstQ: string | null = null;
export function prepareGame(): PreparedQuestion[] {
  let shuffled = shuffleArray(QUESTIONS);
  if (lastFirstQ && shuffled[0].q === lastFirstQ && shuffled.length > 1) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  lastFirstQ = shuffled[0].q;

  return shuffled.map((q) => {
    const indexed = q.options.map((opt, i) => ({ opt, isCorrect: i === q.correct }));
    const shuffledOpts = shuffleArray(indexed);
    return {
      q: q.q,
      options: shuffledOpts.map((s) => s.opt),
      correctIndex: shuffledOpts.findIndex((s) => s.isCorrect),
      explanation: q.explanation,
      hard: !!q.hard,
    };
  });
}

// ============ Leaderboard בסיסי + שמירה מקומית (localStorage) ============

export interface LeaderEntry {
  name: string;
  score: number;
  level: string;
  isYou?: boolean;
}

// טופ קבוע (כולל נועם המכסח בטופ 7 ואילאיי המלך בראש)
export const BASE_LEADERBOARD: LeaderEntry[] = [
  { name: "אילאיי ציונסקי המלך 👑", score: 18420, level: "אגדה" },
  { name: "תום קודנר", score: 16450, level: "אגדה" },
  { name: "יובל שנירררר", score: 15380, level: "מאסטר" },
  { name: "דניאל הפרו", score: 14920, level: "מאסטר" },
  { name: "דור האקר", score: 13870, level: "מאסטר" },
  { name: "גיא בר שדה", score: 12640, level: "פרו" },
  { name: "נועם המכסח 💥", score: 11890, level: "פרו" },
  { name: "מלך ה־Z1", score: 10530, level: "פרו" },
  { name: "אלוף המחשבים", score: 9420, level: "מתקדם" },
  { name: "ZuseFan", score: 8310, level: "מתקדם" },
];

// תאימות לאחור (אם רכיב כלשהו עדיין מייבא LEADERBOARD)
export const LEADERBOARD = BASE_LEADERBOARD;

const STORAGE_KEY = "trivia.scores.v1";
const NAME_KEY = "trivia.player.name";
const BLACKLIST_KEY = "trivia.blacklist.v1";
export const ADMIN_NAME = "Tom_1264";

// פילטר קללות / שמות לא ראויים (עברית + אנגלית מורחב)
const BAD_WORDS = [
  // עברית
  "כוס", "זין", "בן זונה", "בן זונא", "מניאק", "חרא", "פיפי", "קקי",
  "נאצי", "היטלר", "שרמוטה", "זונה", "מטומטם", "אידיוט", "דביל",
  "אשך", "אשכים", "ביצים", "פות", "תחת", "שמן", "הומו", "לסבית",
  "יתרת", "טמבל", "פתי", "מפגר", "חולה נפש", "מסטול", "סמים",
  "אונס", "אנס", "להרוג", "מוות", "מתאבד", "לעזאזל",
  // אנגלית
  "fuck", "shit", "bitch", "nigger", "nigga", "ass", "dick", "porn",
  "sex", "nazi", "hitler", "cunt", "fag", "rape", "kill", "suicide",
  "penis", "vagina", "boobs", "tits", "whore", "slut",
];

// פילטר ג׳יבריש: רצף אותיות חסר משמעות / רק מספרים / רק אות שחוזרת
function isGibberish(name: string): boolean {
  const n = name.trim();
  if (!n) return true;
  // רק מספרים / רק סימנים
  if (/^[\d\W_]+$/.test(n)) return true;
  // אות אחת חוזרת 3+ פעמים ברצף (אאא, bbb)
  if (/(.)\1{2,}/.test(n)) return true;
  // יותר מ־50% מספרים
  const digits = (n.match(/\d/g) || []).length;
  if (digits / n.length > 0.5) return true;
  // רצף ארוך של עיצורים ללא תנועה (אנגלית) — לדוגמה "qwrty"
  if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(n)) return true;
  // רק 2 אותיות שונות לאורך 5+ תווים (סוג של "אבאבא")
  const uniq = new Set(n.replace(/\s/g, "")).size;
  if (n.replace(/\s/g, "").length >= 5 && uniq <= 2) return true;
  return false;
}

export function isNameClean(name: string): boolean {
  const n = name.trim().toLowerCase();
  if (!n) return false;
  if (n.length < 2 || n.length > 20) return false;
  if (BAD_WORDS.some((w) => n.includes(w.toLowerCase()))) return false;
  if (isGibberish(name)) return false;
  return true;
}

export function sanitizeName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, 20);
}

interface SavedScore {
  name: string;
  score: number;
  date: number;
}

function readSaved(): SavedScore[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSaved(scores: SavedScore[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    /* ignore */
  }
}

export function saveScore(name: string, score: number) {
  const clean = sanitizeName(name);
  if (!isNameClean(clean)) return;
  const all = readSaved();
  // נשמור רק את הציון הגבוה ביותר לכל שם
  const existing = all.find((s) => s.name === clean);
  if (existing) {
    if (score > existing.score) {
      existing.score = score;
      existing.date = Date.now();
    }
  } else {
    all.push({ name: clean, score, date: Date.now() });
  }
  writeSaved(all);
}

export function loadPlayerName(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
}

export function savePlayerName(name: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NAME_KEY, sanitizeName(name));
  } catch {
    /* ignore */
  }
}

function levelLabel(score: number): string {
  if (score >= 15000) return "אגדה";
  if (score >= 10000) return "מאסטר";
  if (score >= 6000) return "פרו";
  if (score >= 3000) return "מתקדם";
  return "מתחיל";
}

export function getLeaderboard(currentPlayer?: string): LeaderEntry[] {
  const saved = readSaved().map<LeaderEntry>((s) => ({
    name: s.name,
    score: s.score,
    level: levelLabel(s.score),
    isYou: !!currentPlayer && s.name === currentPlayer,
  }));
  // מיזוג: מסירים כפילויות לפי שם, מעדיפים את הגבוה
  const byName = new Map<string, LeaderEntry>();
  for (const e of [...BASE_LEADERBOARD, ...saved]) {
    const prev = byName.get(e.name);
    if (!prev || e.score > prev.score) byName.set(e.name, e);
    else if (e.isYou) byName.set(e.name, { ...prev, isYou: true });
  }
  return Array.from(byName.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
