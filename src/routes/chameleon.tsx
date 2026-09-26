import { createFileRoute } from "@tanstack/react-router";
import { MecchaGame } from "@/components/MecchaGame";

export const Route = createFileRoute("/chameleon")({
  head: () => ({
    meta: [
      { title: "MECCHA CHAMELEON" },
      { name: "description", content: "3D hide-and-seek: paint your body to blend in, strike a pose, and don't move. Hunters shoot paint at anything suspicious." },
      { property: "og:title", content: "MECCHA CHAMELEON" },
      { property: "og:description", content: "Paint yourself, pose, and hide. Multiplayer in the browser." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;500;700;800;900&family=Noto+Serif:wght@400;500&family=Noto+Sans+SC:wght@500;700&family=Noto+Sans+TC:wght@500;700&family=Noto+Sans+KR:wght@500;700&family=Noto+Sans+Arabic:wght@500;700&family=Noto+Sans+Hebrew:wght@500;700&family=Gveret+Levin&family=Amatic+SC:wght@400;700&display=swap" },
    ],
  }),
  component: MecchaGame,
});
