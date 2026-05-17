export interface Question {
  q: string;
  options: string[];
  correct: number;
  fact?: string;
}

export const QUESTIONS: Question[] = [
  {
    q: "מי בנה את המחשב הראשון Z1?",
    options: ["אלן טיורינג", "קונראד צוזה", "ביל גייטס", "צ׳ארלס באבג׳"],
    correct: 1,
    fact: "קונראד צוזה בנה את ה-Z1 בסלון של הוריו בברלין.",
  },
  {
    q: "באיזו שנה הושלם המחשב Z1?",
    options: ["1928", "1938", "1948", "1958"],
    correct: 1,
  },
  {
    q: "מאיזו מדינה הגיע קונראד צוזה?",
    options: ["ארצות הברית", "אנגליה", "גרמניה", "צרפת"],
    correct: 2,
  },
  {
    q: "מה היה ה-Z1 ביסודו?",
    options: ["מחשב חשמלי", "מחשב מכני לחלוטין", "מחשב קוונטי", "מחשב טרנזיסטורים"],
    correct: 1,
    fact: "ה-Z1 פעל באמצעות חלקים מכניים נעים, ללא טרנזיסטורים.",
  },
  {
    q: "באיזו טכנולוגיה השתמש המחשב ENIAC?",
    options: ["טרנזיסטורים", "שפופרות ואקום", "מעגלים משולבים", "מנועי קיטור"],
    correct: 1,
  },
  {
    q: "מהו ההבדל המרכזי בין מחשבי פעם להיום?",
    options: [
      "פעם היו זולים יותר",
      "פעם היו קטנים יותר",
      "פעם היו ענקיים ואיטיים, היום קטנים ומהירים",
      "אין הבדל משמעותי",
    ],
    correct: 2,
  },
  {
    q: "כמה שטח תפס בערך המחשב ENIAC?",
    options: ["חדר שלם", "מגירה", "כיס", "מזוודה"],
    correct: 0,
  },
  {
    q: "מהו אחד ממשחקי המחשב הראשונים אי פעם?",
    options: ["Fortnite", "Pong", "Minecraft", "Roblox"],
    correct: 1,
  },
  {
    q: "מה היה אופי הגרפיקה במשחקי מחשב פעם?",
    options: ["תלת-ממד מציאותי", "פיקסלים פשוטים בשני ממדים", "אנימציה תלת-ממדית מתקדמת", "וידאו חי"],
    correct: 1,
  },
  {
    q: "מה משמעות הקיצור VR?",
    options: ["Video Recording", "Virtual Reality", "Visual Range", "Very Real"],
    correct: 1,
  },
  {
    q: "מה מאפשרים משקפי VR לשחקן?",
    options: [
      "לראות סרטים בלבד",
      "להרגיש כאילו הוא נמצא בתוך העולם של המשחק",
      "לדבר עם חברים בטלפון",
      "להאזין למוזיקה",
    ],
    correct: 1,
  },
  {
    q: "איזה תחום צפוי להשפיע מאוד על עתיד המחשבים והמשחקים?",
    options: ["בינה מלאכותית", "מכונות כתיבה", "פקסים", "טייפים"],
    correct: 0,
  },
  {
    q: "במה התפתחו משחקי המחשב מאז ימי ה-Pong?",
    options: [
      "נשארו כמעט אותו דבר",
      "הפכו לפשוטים יותר",
      "הפכו ריאליסטיים, מקוונים ועתירי גרפיקה",
      "ירדו באיכות",
    ],
    correct: 2,
  },
  {
    q: "מה משותף לכל המחשבים, מ-Z1 ועד היום?",
    options: [
      "כולם עובדים על קיטור",
      "כולם מבצעים חישובים לפי הוראות",
      "כולם בגודל זהה",
      "כולם משחקים משחקים בלבד",
    ],
    correct: 1,
  },
  {
    q: "מהי המסקנה המרכזית על התפתחות המחשבים?",
    options: [
      "המחשבים עצרו להתפתח",
      "המחשבים מתפתחים במהירות ומשנים את חיינו",
      "המחשבים נעלמים מהעולם",
      "המחשבים פחות חשובים היום",
    ],
    correct: 1,
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
  fact?: string;
}

let lastFirstQ: string | null = null;
export function prepareGame(): PreparedQuestion[] {
  let shuffled = shuffleArray(QUESTIONS);
  // Avoid the same first question two games in a row
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
      fact: q.fact,
    };
  });
}

export const LEADERBOARD = [
  { name: "אילאיי ציונסקי המלך 👑", score: 14820, level: "אגדה" },
  { name: "תום קודנר", score: 12450, level: "מאסטר" },
  { name: "יובל שנירררר", score: 11380, level: "מאסטר" },
  { name: "דניאל הפרו", score: 10920, level: "פרו" },
  { name: "דור האקר", score: 9870, level: "פרו" },
  { name: "גיא בר שדה", score: 8640, level: "פרו" },
  { name: "מלך ה־Z1", score: 7530, level: "מתקדם" },
  { name: "אלוף המחשבים", score: 6420, level: "מתקדם" },
];
