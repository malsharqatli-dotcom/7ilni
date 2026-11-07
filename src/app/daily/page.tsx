import { getOrCreateTodayChallenge } from "@/lib/daily/get-today-challenge";
import DailyChallengeView from "@/components/DailyChallengeView";

export default async function DailyPage() {
  const challenge = await getOrCreateTodayChallenge();

  if (!challenge) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-cream px-4 text-center">
        <p className="font-body text-brand-navy">تعذّر إنشاء تحدي اليوم. حاول مرة ثانية بعد شوي.</p>
      </div>
    );
  }

  return (
    <DailyChallengeView
      date={challenge.date}
      startTitle={challenge.startTitle}
      destinationTitle={challenge.destinationTitle}
    />
  );
}
