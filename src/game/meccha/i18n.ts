// שפת הממשק: אנגלית (כמו במשחק המקורי) או עברית. המפתח הוא הטקסט האנגלי.
export type Lang = "en" | "he";

let lang: Lang = (() => {
  try { return (localStorage.getItem("meccha_lang") as Lang) === "he" ? "he" : "en"; } catch { return "en"; }
})();
const subs = new Set<() => void>();

export function getLang() { return lang; }
export function setLang(l: Lang) {
  lang = l;
  try { localStorage.setItem("meccha_lang", l); } catch { /* ignore */ }
  subs.forEach((f) => f());
}
export function onLang(f: () => void) { subs.add(f); return () => { subs.delete(f); }; }
export const isRtl = () => lang === "he";

/** מתרגם; {n} וכו' מוחלפים בערכים */
export function t(s: string, vars?: Record<string, string | number>) {
  let out = lang === "he" ? HE[s] ?? s : s;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

const HE: Record<string, string> = {
  // תפריט ראשי
  "Home": "בית", "Quit": "יציאה", "Find Server": "מציאת שרת", "Offline (with Bots)": "לא מקוון (עם בוטים)",
  "Server Name": "שם השרת", "Password": "סיסמה", "(none)": "(ללא)", "Max Players": "מספר שחקנים מרבי", "Wrong password": "סיסמה שגויה", "Server is full": "השרת מלא",
  "Search Public Servers": "חיפוש שרתים ציבוריים", "This page's server": "השרת של הדף הזה", "No public servers found": "לא נמצאו שרתים ציבוריים", "Name": "שם", "Join This Page's Server": "הצטרפות לשרת של הדף", "Create Server": "יצירת שרת",
  "Search Server": "חיפוש שרת", "CODE": "קוד", "Join": "הצטרפות", "Practice (Solo + Bots)": "אימון (לבד + בוטים)",
  "Checking for a shared server…": "בודק אם יש שרת משותף…", "Controls": "מקשים", "Language": "שפה",
  "Move": "תזוזה", "Camera (click to lock)": "מצלמה (לחיצה לנעילה)", "Sprint": "ריצה", "Jump / Climb (jump into a wall, hold Space)": "קפיצה / טיפוס (קופצים אל קיר ומחזיקים רווח)",
  "Crouch / climb down": "התכופפות / ירידה בקיר", "Paint mode": "מצב צביעה", "Eyedropper (paint mode)": "טפטפת (במצב צביעה)",
  "Brush size": "גודל מכחול", "Shadow on/off (paint mode)": "צל פועל/כבוי (במצב צביעה)", "Pose wheel": "גלגל תנוחות",
  "Place clone / remove clones": "שכפול / מחיקת שכפולים", "Whistle": "שריקה", "Nameplates": "שמות מעל הראש", "See-through": "ראיה דרך קירות",
  "Free camera / move free camera": "מצלמה חופשית / תנועה חופשית", "Hunter: shoot / FPS-TPS": "צייד: ירייה / גוף ראשון-שלישי",
  "Like (answer check)": "לייק (בדיקת תשובות)", "Vote to skip": "הצבעה לדלג", "Chat": "צ'אט", "Interact (PLAY)": "פעולה (PLAY)", "Settings": "הגדרות",
  // משחק
  "Loading…": "טוען…", "Back": "חזרה", "Leave": "יציאה", "Code:": "קוד:", "(You)": "(את/ה)", "Disconnected": "החיבור נותק",
  "LOBBY": "לובי", "GET READY": "היכונו", "HUNTER WAIT TIME": "זמן המתנת ציידים", "HIDE!": "להתחבא!", "SEARCH TIME": "זמן חיפוש", "ANSWER CHECK": "בדיקת תשובות",
  "Ammo": "תחמושת", "Missed Points": "נקודות החמצה", "Climbing · Space up · Ctrl down · S let go": "מטפסים · רווח למעלה · Ctrl למטה · S לעזוב",
  "FREE CAMERA": "מצלמה חופשית", "· moving (4)": "· בתנועה (4)", "· 4 to move": "· 4 לתנועה", "SEE-THROUGH": "ראיה דרך קירות", "Nameplates OFF": "השמות כבויים",
  "Game Settings / Start": "הגדרות משחק / התחלה", "Game Settings": "הגדרות משחק",
  "Walk to": "לכו אל", "and press": "ולחצו", "Stand on the red": "עמדו על המשטח האדום", "pad to be a hunter": "כדי להיות צייד",
  "You will be a HUNTER": "את/ה תהיה/י צייד/ת", "Character": "דמות",
  "Wait in the lobby until the chameleons finish hiding · F paint · RMB third person": "מחכים בלובי עד שהזיקיות מסיימות להתחבא · F צביעה · קליק ימני גוף שלישי",
  "Spectating {n}": "צופים ב־{n}", "Free camera": "מצלמה חופשית", "click next · 4 move · Shift fast · Space up · Ctrl down": "לחיצה = הבא · 4 תנועה · Shift מהר · רווח למעלה · Ctrl למטה",
  "Esc to release the mouse": "Esc כדי לשחרר את העכבר", "Mute": "השתקה", "Unmute": "ביטול השתקה",
  "Paint": "צביעה", "Pose": "תנוחה", "Clone": "שכפול", "Remove": "מחיקה", "Jump / Climb": "קפיצה / טיפוס", "Crouch": "התכופפות",
  "Shoot": "ירייה", "FPS / TPS": "גוף ראשון / שלישי", "Skip": "דילוג",
  // הגדרות המארח
  "Configure Map": "הגדרת מפה", "Only the host can change the settings.": "רק המארח יכול לשנות את ההגדרות.", "Map": "מפה", "Random": "אקראית", "random": "אקראי",
  "Include in Random": "לכלול בהגרלה", "Game Mode": "מצב משחק", "Filters": "פילטרים", "Monochrome": "שחור-לבן", "Horror": "אימה", "Mosaic": "פסיפס",
  "Rules": "חוקים", "Number of Hunters": "מספר ציידים", "Hunter Wait Time": "זמן המתנת ציידים", "Search Time": "זמן חיפוש", "Answer Check Time": "זמן בדיקת תשובות",
  "Forced Taunt": "שריקה כפויה", "Missed-Points Ranking for Hunters": "דירוג נקודות החמצה לציידים", "Ammo Limit": "הגבלת תחמושת",
  "Allow Petit Chameleon": "לאפשר זיקית פטיט", "Hunter TPS": "גוף שלישי לציידים", "Practice (solo only)": "אימון (לבד בלבד)", "Bots": "בוטים", "Bot Level": "רמת בוטים",
  "Easy": "קל", "Normal": "רגיל", "Hard": "קשה", "ON": "פועל", "OFF": "כבוי", "Start": "התחלה", "{n} players": "{n} שחקנים", "Random map": "מפה אקראית",
  "Basic": "בסיסי", "Infection": "הדבקה", "Double": "כפול", "Reverse Chicken Race": "מרוץ תרנגולות הפוך",
  "Hunters must find every chameleon before time runs out.": "הציידים צריכים למצוא את כל הזיקיות לפני שהזמן נגמר.",
  "Chameleons that get hit join the hunters.": "זיקית שנפגעת מצטרפת לציידים.",
  "Everyone hides, then everyone hunts. Most finds wins.": "כולם מתחבאים, ואז כולם מחפשים. מי שמוצא הכי הרבה מנצח.",
  "Hunters see what every chameleon looks like. First to find scores; most points wins.": "הציידים רואים איך כל זיקית נראית. הראשון שמוצא מקבל נקודות; הכי הרבה נקודות מנצח.",
  // דמות
  "Starting in {n}": "מתחילים בעוד {n}", "Map:": "מפה:", "Size": "גודל", "Petit Chameleon": "זיקית פטיט", "Body Type": "סוג גוף", "Cube": "קובייה", "Plump": "שמנמן", "OK": "אישור",
  // אפשרויות
  "Mouse Sensitivity": "רגישות עכבר", "Volume": "עוצמת קול", "Shadow Quality": "איכות צל", "Off": "כבוי", "Low": "נמוכה", "High": "גבוהה",
  "Performance Mode": "מצב ביצועים", "Back to Game": "חזרה למשחק",
  // בדיקת תשובות
  "HIDERS WIN": "הזיקיות ניצחו", "HUNTERS WIN": "הציידים ניצחו", "{n} WINS": "{n} ניצח/ה", "Red": "אדום", "= not found": "= לא נמצא", "Blue": "כחול", "= found": "= נמצא",
  "Finds": "מציאות", "Results": "תוצאות", "found": "נמצא", "safe": "שרד", "Sent": "נשלח", "WASD / Space / Ctrl free camera": "WASD / רווח / Ctrl מצלמה חופשית",
  // צביעה
  "Pick": "טפטפת", "Brightness": "בהירות", "Metallic": "מתכתיות", "Roughness": "חספוס", "Emissive": "זוהר", "V Shadow ON": "V צל פועל", "V Shadow OFF": "V צל כבוי",
  "LMB paint · hold Space = eyedropper · RMB drag = brush size · MMB / Alt+LMB rotate · wheel zoom (Space+wheel = colours) · F close":
    "קליק שמאלי צביעה · החזקת רווח = טפטפת · גרירה ימנית = גודל מכחול · גלגלת / Alt+שמאלי סיבוב · גלגלת זום (רווח+גלגלת = צבעים) · F סגירה",
  // מגע
  "FIRE": "ירייה", "Done": "סיום", "Jump": "קפיצה", "Next": "הבא",
  // מפות וחדרים
  "Lobby": "לובי", "Hide-and-Seek Mansion": "אחוזת המחבואים", "Indoor Country": "כפר מקורה", "Sewer": "ביוב", "Backrooms": "בקרומס", "Penguin Hotel": "מלון הפינגווינים",
  "Sugarland": "ארץ הממתקים", "Osaka": "אוסקה", "Egypt": "מצרים", "Death Burger": "דת' בורגר", "Greece": "יוון", "Deep Sea": "מעמקי הים", "Shopping Mall": "קניון",
  "Kyoto": "קיוטו", "Art Museum": "מוזיאון לאמנות", "Art Gallery": "גלריה לאמנות", "Cold Storage": "חדר קירור", "Brick Loft": "לופט לבנים",
  "Swimming Pool": "בריכת שחייה", "Cherry Blossom Garden": "גן הדובדבנים", "Meeting Room": "חדר ישיבות", "School": "בית ספר", "Amusement Park": "לונה פארק", "Hot Spring Inn": "מלון מעיינות חמים",
  "Main Hall": "האולם הראשי", "Library": "ספרייה", "Kitchen": "מטבח", "Laundry": "חדר כביסה", "Laundry Room": "חדר כביסה", "Storage": "מחסן", "Bathroom": "חדר רחצה",
  "Hallway": "מסדרון", "Stage Entrance": "כניסה לבמה", "Barn": "אסם", "Entrance": "כניסה", "Ballroom": "אולם נשפים", "Bedroom": "חדר שינה",
  // הודעות מהמנוע
  "Need at least 2 players (add Bots in Settings)": "צריך לפחות 2 שחקנים (אפשר להוסיף בוטים בהגדרות)", "You are now the host": "את/ה עכשיו המארח/ת",
  "Out of ammo": "נגמרה התחמושת", "{n} joined": "{n} הצטרף/ה", "{n} left": "{n} יצא/ה",
};
