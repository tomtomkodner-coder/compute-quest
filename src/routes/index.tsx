import { createFileRoute } from "@tanstack/react-router";
import { TriviaGame } from "@/components/TriviaGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "איך יצרו את המחשב הראשון? — משחק טריוויה" },
      { name: "description", content: "משחק טריוויה עתידני בעברית על Z1, ENIAC, קונראד צוזה והתפתחות המחשבים. תום, איליי, דור ויובל — כיתה ח׳3." },
      { property: "og:title", content: "איך יצרו את המחשב הראשון? — Cyber Trivia" },
      { property: "og:description", content: "משחק טריוויה עתידני בעברית על המחשב הראשון, Z1, ENIAC ועוד." },
    ],
  }),
  component: Index,
});

function Index() {
  return <TriviaGame />;
}
