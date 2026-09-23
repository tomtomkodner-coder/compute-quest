import { createFileRoute } from "@tanstack/react-router";
import { MecchaGame } from "@/components/MecchaGame";

export const Route = createFileRoute("/chameleon")({
  head: () => ({
    meta: [
      { title: "Meccha Chameleon — מחבואים עם צבעים" },
      {
        name: "description",
        content: "משחק מחבואים בתלת־ממד בדפדפן: צבעו את הזיקית שלכם כדי להתמזג עם הבית, או שחקו כצייד ומצאו את הזיקיות.",
      },
      { property: "og:title", content: "Meccha Chameleon 🦎🎨" },
      { property: "og:description", content: "מחבואים בתלת־ממד עם צביעה, תנוחות ושומרים חכמים." },
    ],
  }),
  component: MecchaGame,
});
