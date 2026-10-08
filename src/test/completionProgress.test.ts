import { describe, expect, it } from 'vitest';
import jerusalem from '../../public/data/jerusalem-time-of-christ.json';
import divineEconomy from '../../public/data/to-schedio-tis-theias-oikonomias.json';
import { getCompletionProgress } from '@/lib/completionProgress';
import { LessonQuiz, scoreQuiz } from '@/data/quizData';
import { resolveInteractivePlaybackRate, shouldLoopInteractiveVideo } from '@/lib/interactivePlayback';

describe('scenario completion', () => {
  const ids = jerusalem.completion.required_character_ids;
  const target = jerusalem.completion.required_count;

  it('unlocks Jerusalem for every combination of three different characters', () => {
    expect(new Set(ids)).toEqual(new Set(jerusalem.characters.map((npc) => npc.id)));
    expect(target).toBe(3);
    for (let first = 0; first < ids.length; first++) {
      for (let second = first + 1; second < ids.length; second++) {
        expect(getCompletionProgress(ids, new Set([ids[first], ids[second]]), target).reached).toBe(false);
        for (let third = second + 1; third < ids.length; third++) {
          expect(getCompletionProgress(ids, new Set([ids[first], ids[second], ids[third]]), target))
            .toEqual({ count: 3, target: 3, reached: true });
        }
      }
    }
  });

  it('counts a repeated visit once and ignores props and unrelated ids', () => {
    expect(getCompletionProgress([...ids, ids[0]], new Set([ids[0], ids[0], 'dimitris', 'lamb']), target))
      .toEqual({ count: 1, target: 3, reached: false });
    expect(getCompletionProgress([], new Set(), target).reached).toBe(false);
  });

  it('retains the original requirement to visit all five Divine Economy characters', () => {
    const originalIds = divineEconomy.completion.required_character_ids;
    expect(originalIds).toHaveLength(5);
    expect(getCompletionProgress(originalIds, new Set(originalIds.slice(0, 3))))
      .toEqual({ count: 3, target: 5, reached: false });
    expect(getCompletionProgress(originalIds, new Set(originalIds)).reached).toBe(true);
  });

  it('falls back to all listed characters for invalid thresholds and clamps excessive ones', () => {
    for (const invalid of [0, -1, 1.5, NaN]) {
      expect(getCompletionProgress(ids, new Set(), invalid).target).toBe(ids.length);
    }
    expect(getCompletionProgress(ids, new Set(ids), 99).target).toBe(ids.length);
  });
});

describe('Jerusalem biblical typology quiz', () => {
  const quiz: LessonQuiz = {
    id: jerusalem.quiz.id,
    hostPropId: jerusalem.quiz.host_prop_id,
    hostName: jerusalem.quiz.host_name,
    hostTitle: jerusalem.quiz.host_title,
    intro: jerusalem.quiz.intro,
    passScore: jerusalem.quiz.pass_score,
    rewardText: jerusalem.quiz.reward_text,
    questions: jerusalem.quiz.questions.map((question) => ({
      ...question, correctIndex: question.correct_index,
    })),
  };

  it('covers all six objects with explanations and valid answers', () => {
    expect(quiz.questions.map((question) => question.id).sort()).toEqual(
      jerusalem.props.filter((prop) => prop.glbModel.includes('/biblical/')).map((prop) => prop.id).sort(),
    );
    for (const question of quiz.questions) {
      expect(question.options[question.correctIndex]).toBeTruthy();
      expect(question.explanation.length).toBeGreaterThan(40);
    }
    expect(quiz.passScore).toBe(4);
  });

  it('passes at four correct answers and allows a retry at three', () => {
    const answers = quiz.questions.map((question) => question.correctIndex);
    const wrong = (index: number) => (answers[index] + 1) % quiz.questions[index].options.length;
    expect(scoreQuiz(quiz, [...answers.slice(0, 4), wrong(4), wrong(5)]))
      .toEqual({ score: 4, total: 6, passed: true });
    expect(scoreQuiz(quiz, [...answers.slice(0, 3), wrong(3), wrong(4), wrong(5)]))
      .toEqual({ score: 3, total: 6, passed: false });
  });

  it('uses separate exploration and quiz videos and extends the quiz reward by 1.5 times', () => {
    expect(jerusalem.completion.reward_interactive.video_url).toBe('/media/jerusalem-shadow-to-truth.mp4');
    expect(jerusalem.quiz.reward_interactive.video_url).toBe('/media/jerusalem-quiz-success.mp4');
    expect(10.048 / resolveInteractivePlaybackRate(jerusalem.quiz.reward_interactive.playback_rate)).toBeCloseTo(10.048 * 1.5, 5);
    expect(shouldLoopInteractiveVideo('quiz-reward', jerusalem.quiz.reward_interactive.loop)).toBe(false);
  });
});
