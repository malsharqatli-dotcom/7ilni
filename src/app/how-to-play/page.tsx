import { Suspense } from "react";
import HowToPlayView from "@/components/HowToPlayView";

export default function HowToPlayPage() {
  return (
    <Suspense>
      <HowToPlayView />
    </Suspense>
  );
}
