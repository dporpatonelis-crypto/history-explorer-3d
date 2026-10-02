import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useProgress } from '../hooks/useProgress';

describe('environment-scoped progress', () => {
  beforeEach(() => localStorage.clear());

  it('preserves the existing Agora key and keeps Jerusalem visits separate across switches', () => {
    localStorage.setItem('ancientAgora_progress', JSON.stringify(['socrates']));
    const { result, rerender } = renderHook(({ scope }) => useProgress(scope), {
      initialProps: { scope: 'agora' },
    });

    expect(result.current.visited.has('socrates')).toBe(true);
    rerender({ scope: 'jerusalem-time-of-christ' });
    expect(result.current.visited.has('socrates')).toBe(false);

    act(() => result.current.markVisited('aristotle'));
    expect(JSON.parse(localStorage.getItem('ancientAgora_progress:jerusalem-time-of-christ') ?? '[]'))
      .toEqual(['aristotle']);

    rerender({ scope: 'agora' });
    expect(result.current.visited.has('socrates')).toBe(true);
    expect(result.current.visited.has('aristotle')).toBe(false);
  });
});
