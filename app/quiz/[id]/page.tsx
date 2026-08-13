import QuizRunner from "@/components/quiz/QuizRunner";

export const dynamic = "force-dynamic";

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <QuizRunner quizId={id} />;
}
