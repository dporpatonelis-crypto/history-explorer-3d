import { useEffect, useState } from 'react';
import { CheckCircle2, RotateCcw, Volume2, XCircle } from 'lucide-react';
import { LessonQuiz, QuizResult, scoreQuiz } from '@/data/quizData';
import { narrate, stopSpeaking } from '@/lib/lipsync';

interface QuizDialogContentProps {
  quiz: LessonQuiz;
  initialResult?: QuizResult | null;
  onComplete: (result: QuizResult) => void;
  onRetry: () => void;
}

export function QuizDialogContent({
  quiz,
  initialResult = null,
  onComplete,
  onRetry,
}: QuizDialogContentProps) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [result, setResult] = useState<QuizResult | null>(initialResult);
  const question = quiz.questions[questionIndex];
  const shouldNarrateQuestion = !result;

  useEffect(() => {
    if (shouldNarrateQuestion && question) {
      void narrate(quiz.hostPropId, question.prompt, question.audioUrl);
    }
  }, [question, quiz.hostPropId, shouldNarrateQuestion]);

  const chooseOption = (optionIndex: number) => {
    if (selectedOption !== null) return;
    stopSpeaking();
    setSelectedOption(optionIndex);
  };

  const continueQuiz = () => {
    if (selectedOption === null) return;
    const nextAnswers = [...answers];
    nextAnswers[questionIndex] = selectedOption;

    if (questionIndex === quiz.questions.length - 1) {
      const nextResult = scoreQuiz(quiz, nextAnswers);
      setAnswers(nextAnswers);
      setResult(nextResult);
      onComplete(nextResult);
      return;
    }

    setAnswers(nextAnswers);
    setQuestionIndex((index) => index + 1);
    setSelectedOption(null);
  };

  const retry = () => {
    stopSpeaking();
    setQuestionIndex(0);
    setAnswers([]);
    setSelectedOption(null);
    setResult(null);
    onRetry();
  };

  if (result) {
    return (
      <div className="space-y-4" data-lesson-quiz-result={result.passed ? 'passed' : 'retry'}>
        <div
          className={`rounded-xl border p-5 text-center ${
            result.passed
              ? 'border-emerald-500/50 bg-emerald-500/10'
              : 'border-amber-500/50 bg-amber-500/10'
          }`}
        >
          {result.passed ? (
            <CheckCircle2 className="mx-auto mb-3 text-emerald-600" size={34} />
          ) : (
            <XCircle className="mx-auto mb-3 text-amber-600" size={34} />
          )}
          <p className="font-cinzel text-lg font-bold text-foreground">
            {result.passed ? 'Επιτυχής ολοκλήρωση' : 'Χρειάζεται ακόμη μία προσπάθεια'}
          </p>
          <p className="mt-2 font-cormorant text-xl text-foreground">
            Αποτέλεσμα: {result.score}/{result.total}
          </p>
          <p className="mt-1 font-cormorant text-base text-muted-foreground">
            {result.passed
              ? `Πέτυχες το όριο των ${quiz.passScore} σωστών απαντήσεων.`
              : `Χρειάζονται τουλάχιστον ${quiz.passScore} σωστές απαντήσεις.`}
          </p>
        </div>

        {!result.passed && (
          <button
            type="button"
            onClick={retry}
            className="mx-auto flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-cinzel text-sm text-primary-foreground hover:opacity-90"
          >
            <RotateCcw size={15} /> Νέα προσπάθεια
          </button>
        )}
      </div>
    );
  }

  const isCorrect = selectedOption === question.correctIndex;

  return (
    <div className="space-y-4" data-lesson-quiz-question={question.id}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-cinzel text-xs font-semibold uppercase tracking-wider text-primary">
            Ερώτηση {questionIndex + 1} από {quiz.questions.length}
          </p>
          <p className="mt-1 font-cormorant text-sm text-muted-foreground">
            Επιτυχία με {quiz.passScore}/{quiz.questions.length}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void narrate(quiz.hostPropId, question.prompt, question.audioUrl)}
          className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 font-cinzel text-xs text-secondary-foreground hover:bg-secondary/80"
          aria-label="Επανάληψη εκφώνησης ερώτησης"
        >
          <Volume2 size={15} /> Εκφώνηση
        </button>
      </div>

      <p className="font-cormorant text-xl font-semibold leading-snug text-foreground">
        {question.prompt}
      </p>

      <div className="space-y-2">
        {question.options.map((option, optionIndex) => {
          const selected = selectedOption === optionIndex;
          const correct = selectedOption !== null && optionIndex === question.correctIndex;
          const incorrect = selected && !correct;
          return (
            <button
              key={option}
              type="button"
              disabled={selectedOption !== null}
              onClick={() => chooseOption(optionIndex)}
              className={`w-full rounded-lg border p-3 text-left font-cormorant text-base transition-colors ${
                correct
                  ? 'border-emerald-500 bg-emerald-500/10 text-foreground'
                  : incorrect
                    ? 'border-destructive bg-destructive/10 text-foreground'
                    : 'border-border bg-secondary/45 text-foreground hover:bg-secondary'
              } disabled:cursor-default`}
            >
              <span className="mr-2 font-cinzel text-xs text-muted-foreground">
                {String.fromCharCode(65 + optionIndex)}.
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {selectedOption !== null && (
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <p className={`font-cinzel text-sm font-bold ${isCorrect ? 'text-emerald-700' : 'text-destructive'}`}>
            {isCorrect ? 'Σωστά.' : 'Όχι ακριβώς.'}
          </p>
          {question.explanation && (
            <p className="mt-1 font-cormorant text-base leading-relaxed text-foreground">
              {question.explanation}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={selectedOption === null}
        onClick={continueQuiz}
        className="w-full rounded-lg bg-primary px-4 py-2.5 font-cinzel text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {questionIndex === quiz.questions.length - 1 ? 'Ολοκλήρωση quiz' : 'Επόμενη ερώτηση'}
      </button>
    </div>
  );
}
