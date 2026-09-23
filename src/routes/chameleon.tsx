import { createFileRoute } from "@tanstack/react-router";
import { ChameleonGame } from "@/components/ChameleonGame";

export const Route = createFileRoute("/chameleon")({
  head: () => ({
    meta: [
      { title: "הזיקית המציירת — משחק ציור וזיהוי" },
      { name: "description", content: "משחק מסיבה בעברית: כולם מציירים את המילה הסודית, רק הזיקית לא יודעת מה היא. תגלו מי מזייף!" },
      { property: "og:title", content: "הזיקית המציירת 🦎" },
      { property: "og:description", content: "משחק ציור וזיהוי בעברית לטלפון אחד." },
    ],
  }),
  component: ChameleonGame,
});
