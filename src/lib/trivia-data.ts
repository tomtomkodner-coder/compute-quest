export type Difficulty = "קל" | "בינוני" | "קשה";

export interface Question {
  q: string;
  options: string[];
  correct: number; // index in original options
  difficulty: Difficulty;
  topic: string;
  fact?: string;
}

export const QUESTIONS: Question[] = [
  {
    q: "מי המציא את המחשב הראשון Z1?",
    options: ["אלן טיורינג", "קונראד צוזה", "ביל גייטס", "סטיב ג'ובס"],
    correct: 1,
    difficulty: "קל",
    topic: "Z1",
    fact: "קונראד צוזה בנה את ה-Z1 בסלון של ההורים שלו בברלין!",
  },
  {
    q: "באיזו שנה נבנה המחשב Z1?",
    options: ["1936", "1938", "1945", "1950"],
    correct: 1,
    difficulty: "בינוני",
    topic: "Z1",
    fact: "ה-Z1 הושלם בשנת 1938 והיה מחשב מכני לחלוטין.",
  },
  {
    q: "מה הייתה הטכנולוגיה המרכזית של ה-ENIAC?",
    options: ["טרנזיסטורים", "שפופרות ואקום", "מעגלים משולבים", "ממסרים מגנטיים"],
    correct: 1,
    difficulty: "בינוני",
    topic: "ENIAC",
    fact: "ENIAC השתמש ב-17,468 שפופרות ואקום ושקל כ-30 טונות!",
  },
  {
    q: "כמה שקל בערך מחשב ה-ENIAC?",
    options: ["3 טון", "10 טון", "30 טון", "100 טון"],
    correct: 2,
    difficulty: "קשה",
    topic: "ENIAC",
  },
  {
    q: "באיזו מדינה נולד קונראד צוזה?",
    options: ["ארה״ב", "אנגליה", "גרמניה", "צרפת"],
    correct: 2,
    difficulty: "קל",
    topic: "קונראד צוזה",
  },
  {
    q: "מה היה המקצוע המקורי של קונראד צוזה?",
    options: ["מתמטיקאי", "מהנדס בניין", "פיזיקאי", "מורה"],
    correct: 1,
    difficulty: "קשה",
    topic: "קונראד צוזה",
    fact: "צוזה היה מהנדס בניין שהשתעמם מחישובים ידניים — אז המציא מחשב!",
  },
  {
    q: "איזה משחק מחשב יצא בשנת 1972 ונחשב לאחד הראשונים?",
    options: ["Mario", "Pong", "Tetris", "Pac-Man"],
    correct: 1,
    difficulty: "קל",
    topic: "משחקי מחשב",
  },
  {
    q: "מתי יצא המשחק האייקוני Pac-Man?",
    options: ["1978", "1980", "1985", "1990"],
    correct: 1,
    difficulty: "בינוני",
    topic: "משחקי מחשב",
  },
  {
    q: "מה משמעות ראשי התיבות VR?",
    options: ["Video Reality", "Virtual Reality", "Visual Resolution", "Vector Render"],
    correct: 1,
    difficulty: "קל",
    topic: "VR",
  },
  {
    q: "איזו חברה השיקה את משקפי ה-Oculus Rift?",
    options: ["Sony", "Microsoft", "Meta (Facebook)", "Apple"],
    correct: 2,
    difficulty: "בינוני",
    topic: "VR",
  },
  {
    q: "כמה זיכרון RAM היה למחשב הביתי הראשון לעומת היום?",
    options: ["1KB מול 16GB", "4KB מול 32GB", "16KB מול 64GB", "64KB מול 128GB"],
    correct: 1,
    difficulty: "קשה",
    topic: "פעם והיום",
  },
  {
    q: "מה היה גודל המסך הממוצע של מחשב פעם?",
    options: ["שחור-לבן 12 אינץ׳", "צבעוני 24 אינץ׳", "OLED 32 אינץ׳", "4K 27 אינץ׳"],
    correct: 0,
    difficulty: "קל",
    topic: "פעם והיום",
  },
  {
    q: "מי נחשב לאבי האינטרנט (WWW)?",
    options: ["סטיב ג'ובס", "טים ברנרס-לי", "מארק צוקרברג", "לארי פייג'"],
    correct: 1,
    difficulty: "בינוני",
    topic: "אינטרנט",
    fact: "טים ברנרס-לי המציא את ה-WWW בשנת 1989 ב-CERN.",
  },
  {
    q: "באיזו שנה הומצא העכבר למחשב?",
    options: ["1964", "1972", "1981", "1990"],
    correct: 0,
    difficulty: "קשה",
    topic: "אינטרנט",
  },
  {
    q: "איזו שפת תכנות פיתח צוזה למחשבים שלו?",
    options: ["Fortran", "Plankalkül", "COBOL", "Basic"],
    correct: 1,
    difficulty: "קשה",
    topic: "קונראד צוזה",
    fact: "Plankalkül הייתה אחת משפות התכנות הראשונות אי פעם!",
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
  difficulty: Difficulty;
  topic: string;
  fact?: string;
}

export function prepareGame(): PreparedQuestion[] {
  return shuffleArray(QUESTIONS).map((q) => {
    const indexed = q.options.map((opt, i) => ({ opt, isCorrect: i === q.correct }));
    const shuffled = shuffleArray(indexed);
    return {
      q: q.q,
      options: shuffled.map((s) => s.opt),
      correctIndex: shuffled.findIndex((s) => s.isCorrect),
      difficulty: q.difficulty,
      topic: q.topic,
      fact: q.fact,
    };
  });
}

export const LEADERBOARD = [
  { name: "אילאיי ציונסקי המלך 👑", score: 14820, level: "אגדה" },
  { name: "תום קודנר", score: 12450, level: "מאסטר" },
  { name: "Mr.Z1", score: 11380, level: "מאסטר" },
  { name: "יובל שנירררר", score: 10920, level: "פרו" },
  { name: "דור האקר", score: 9870, level: "פרו" },
  { name: "גיא בר שדה", score: 8640, level: "פרו" },
  { name: "VR Master", score: 7530, level: "מתקדם" },
  { name: "Retro Gamer", score: 6420, level: "מתקדם" },
];
