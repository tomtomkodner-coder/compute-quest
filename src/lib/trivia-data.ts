export interface Question {
  q: string;
  options: string[];
  correct: number;
  fact?: string;
}

// כל השאלות מבוססות אך ורק על טקסט עבודת החקר של תום, איליי, דור, דניאל ויובל - כיתה ח'3
export const QUESTIONS: Question[] = [
  {
    q: "מהו שם עבודת החקר?",
    options: [
      "איך יצרו את המחשב הראשון",
      "ההיסטוריה של האינטרנט",
      "התפתחות הטלפון החכם",
      "איך עובדת בינה מלאכותית",
    ],
    correct: 0,
    fact: "שם העבודה: 'איך יצרו את המחשב הראשון'.",
  },
  {
    q: "מי הם התלמידים שכתבו את עבודת החקר?",
    options: [
      "תום, איליי, דור, דניאל ויובל",
      "תום, רון, דני ויואב",
      "איליי, דור ויובל בלבד",
      "תום ודניאל",
    ],
    correct: 0,
  },
  {
    q: "באיזו כיתה לומדים כותבי העבודה?",
    options: ["ח'1", "ח'2", "ח'3", "ט'3"],
    correct: 2,
  },
  {
    q: "באיזה נושא בחרו התלמידים לחקור?",
    options: ["משחקי מחשב", "רובוטיקה", "חלל", "רשתות חברתיות"],
    correct: 0,
    fact: "לפי המבוא: 'בחרנו לחקור את הנושא של משחקי מחשב'.",
  },
  {
    q: "מדוע הנושא מעניין את התלמידים לפי המבוא?",
    options: [
      "כי הם רוצים להיות מתכנתים",
      "כי הם אוהבים משחקי וידאו ורצו להבין איך הם עובדים",
      "כי המורה ביקשה",
      "כי זה הנושא הכי קל",
    ],
    correct: 1,
  },
  {
    q: "באילו אמצעים משתמשים משחקי מחשב כדי ליצור דמויות ותנועה לפי הטקסט?",
    options: [
      "נייר ועיפרון",
      "תוכנות, גרפיקה ובינה מלאכותית",
      "מצלמות בלבד",
      "שחקנים אמיתיים בלבד",
    ],
    correct: 1,
    fact: "מהמבוא: 'משחקי מחשב משתמשים בתוכנות, גרפיקה ובינה מלאכותית'.",
  },
  {
    q: "מה משחקי המחשב יוצרים בעזרת תוכנות וגרפיקה?",
    options: [
      "ספרים וסיפורים",
      "דמויות, מפות ותנועה",
      "מוזיקה בלבד",
      "סרטונים בלבד",
    ],
    correct: 1,
  },
  {
    q: "מהי שאלת החקר של העבודה?",
    options: [
      "מי המציא את משחקי הווידאו?",
      "כיצד יצרו את המחשב הראשון?",
      "איך פועלת בינה מלאכותית?",
      "מהו המחשב הכי מהיר בעולם?",
    ],
    correct: 1,
  },
  {
    q: "מדוע נבחרה שאלת החקר הזו לפי הטקסט?",
    options: [
      "כדי להבין איך התחיל עולם המחשבים ואיך הגיעו למחשבים ולמשחקים המתקדמים של היום",
      "כדי ללמוד לתכנת",
      "כדי לבנות מחשב חדש",
      "כדי להשוות בין חברות מחשבים",
    ],
    correct: 0,
  },
  {
    q: "מה רצו התלמידים להבין מעבר למחשב הראשון?",
    options: [
      "איך מוכרים מחשבים",
      "איך התפתחו המחשבים עד למשחקים שיש היום",
      "איך מתקנים מחשב",
      "כמה עולה מחשב",
    ],
    correct: 1,
  },
  {
    q: "מי בנה את המחשב הראשון Z1 לפי העבודה?",
    options: ["אלן טיורינג", "קונראד צוזה", "ביל גייטס", "סטיב ג'ובס"],
    correct: 1,
  },
  {
    q: "מה מייצגות האותיות VR שמוזכרות בעבודה?",
    options: [
      "Video Recording",
      "Virtual Reality (מציאות מדומה)",
      "Very Real",
      "Visual Range",
    ],
    correct: 1,
  },
  {
    q: "מהו ההבדל המרכזי בין מחשבי פעם למחשבי היום לפי העבודה?",
    options: [
      "פעם היו זולים יותר",
      "פעם היו ענקיים ואיטיים, היום קטנים ומהירים",
      "אין הבדל",
      "פעם היו צבעוניים יותר",
    ],
    correct: 1,
  },
  {
    q: "מה כותבי העבודה אוהבים, לפי המבוא?",
    options: ["ספורט", "משחקי וידאו", "מוזיקה קלאסית", "ציור"],
    correct: 1,
  },
  {
    q: "מהי המסקנה המרכזית של העבודה?",
    options: [
      "המחשבים הפסיקו להתפתח",
      "המחשבים התפתחו מאוד מאז המחשב הראשון ועד למשחקי הווידאו של היום",
      "משחקי מחשב פחות חשובים היום",
      "אין קשר בין המחשב הראשון למשחקים של היום",
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
