import type { InteractiveMediaConfig } from '@/components/EnvironmentScreens';

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  audioUrl?: string;
}

export interface LessonQuiz {
  id: string;
  hostPropId: string;
  hostName: string;
  hostTitle: string;
  intro: string;
  passScore: number;
  rewardText: string;
  rewardAudioUrl?: string;
  rewardInteractive?: InteractiveMediaConfig;
  questions: QuizQuestion[];
}

export interface QuizResult {
  score: number;
  total: number;
  passed: boolean;
}

export function scoreQuiz(quiz: LessonQuiz, answers: number[]): QuizResult {
  const score = quiz.questions.reduce(
    (total, question, index) => total + (answers[index] === question.correctIndex ? 1 : 0),
    0,
  );

  return {
    score,
    total: quiz.questions.length,
    passed: score >= quiz.passScore,
  };
}
