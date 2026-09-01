import { describe, expect, it } from 'vitest';
import { LessonQuiz, scoreQuiz } from '@/data/quizData';

const quiz: LessonQuiz = {
  id: 'understanding',
  hostPropId: 'dimitris',
  hostName: 'Δημήτρης',
  hostTitle: 'Συντονιστής',
  intro: 'Τρεις ερωτήσεις',
  passScore: 2,
  rewardText: 'Μπράβο!',
  questions: [
    { id: 'q1', prompt: 'Q1', options: ['A', 'B'], correctIndex: 0 },
    { id: 'q2', prompt: 'Q2', options: ['A', 'B'], correctIndex: 1 },
    { id: 'q3', prompt: 'Q3', options: ['A', 'B'], correctIndex: 0 },
  ],
};

describe('scoreQuiz', () => {
  it('passes with two correct answers out of three', () => {
    expect(scoreQuiz(quiz, [0, 1, 1])).toEqual({ score: 2, total: 3, passed: true });
  });

  it('does not pass with one correct answer', () => {
    expect(scoreQuiz(quiz, [0, 0, 1])).toEqual({ score: 1, total: 3, passed: false });
  });
});
