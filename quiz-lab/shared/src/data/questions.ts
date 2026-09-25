import type { QuestionDefinition } from "../types";

/**
 * Built-in demo question bank (original content written for this project).
 * 20 questions → matches the "7 / 20" style counter on the dashboard.
 */
const q = (
  id: string,
  text: string,
  answers: [string, string, string, string],
  correct: "A" | "B" | "C" | "D",
  timeLimitMs?: number,
): QuestionDefinition => ({
  id,
  text,
  answers: answers.map((t, i) => ({ id: "ABCD"[i]!, text: t })),
  correctAnswerId: correct,
  ...(timeLimitMs ? { timeLimitMs } : {}),
});

export const DEFAULT_QUESTIONS: QuestionDefinition[] = [
  q("q01", "מהי בירת יפן?", ["סיאול", "טוקיו", "בייג׳ינג", "בנגקוק"], "B"),
  q("q02", "כמה סיביות (bits) יש בבייט אחד?", ["4", "16", "8", "32"], "C"),
  q("q03", "איזה פרוטוקול משמש לתקשורת דו-כיוונית רציפה בדפדפן?", ["FTP", "SMTP", "WebSocket", "DNS"], "C"),
  q("q04", "מהו היסוד הכימי שסימנו O?", ["זהב", "חמצן", "אוסמיום", "אבץ"], "B"),
  q("q05", "איזה קוד סטטוס HTTP מציין 'לא נמצא'?", ["200", "301", "500", "404"], "D"),
  q("q06", "כמה צלעות יש למשושה?", ["6", "5", "8", "7"], "A"),
  q("q07", "באיזו שנה נחת האדם הראשון על הירח?", ["1965", "1969", "1972", "1959"], "B"),
  q("q08", "מהי הפלנטה הגדולה ביותר במערכת השמש?", ["שבתאי", "נפטון", "צדק", "כדור הארץ"], "C"),
  q("q09", "מה מחזירה הפעולה typeof null ב-JavaScript?", ["\"null\"", "\"undefined\"", "\"object\"", "\"number\""], "C"),
  q("q10", "איזה אוקיינוס הוא הגדול בעולם?", ["האטלנטי", "ההודי", "הארקטי", "השקט"], "D"),
  q("q11", "מהו 2 בחזקת 10?", ["1024", "1000", "512", "2048"], "A"),
  q("q12", "מי צייר את 'המונה ליזה'?", ["מיכלאנג׳לו", "רפאל", "לאונרדו דה וינצ׳י", "ון גוך"], "C"),
  q("q13", "באיזו פקודת git יוצרים ענף חדש ועוברים אליו?", ["git merge -b", "git checkout -b", "git push -b", "git init -b"], "B"),
  q("q14", "מהו היונק הגדול ביותר בעולם?", ["פיל אפריקאי", "לווייתן כחול", "ג׳ירפה", "כריש לווייתן"], "B"),
  q("q15", "כמה דקות יש ב-3 שעות?", ["120", "150", "160", "180"], "D"),
  q("q16", "איזו שפה רצה באופן מובנה בדפדפן?", ["JavaScript", "Python", "C#", "Go"], "A"),
  q("q17", "מהו הים המלוח ביותר מבין הבאים?", ["הים התיכון", "ים המלח", "הים האדום", "הים השחור"], "B"),
  q("q18", "מה פירוש ראשי התיבות API?", ["Application Programming Interface", "Advanced Protocol Integration", "Automated Program Index", "Applied Process Internet"], "A"),
  q("q19", "כמה שחקנים יש בקבוצת כדורגל על המגרש?", ["9", "10", "11", "12"], "C"),
  q("q20", "איזה מבנה נתונים פועל בשיטת LIFO?", ["תור (Queue)", "מחסנית (Stack)", "עץ (Tree)", "גרף (Graph)"], "B"),
];
