import { afterEach, describe, expect, it, vi } from 'vitest';
import { HistoryManager } from '../src';

type Counter = { count: number };

describe('HistoryManager', () => {
  afterEach(() => vi.useRealTimers());

  it('applies, undoes, and redoes patches', () => {
    const history = new HistoryManager<Counter>();
    let state = { count: 0 };
    state = history.apply(state, draft => { draft.count = 1; }, { label: 'Increment' });
    expect(state).toEqual({ count: 1 });
    expect(history.getUndoLabel()).toBe('Increment');

    state = history.undo(state);
    expect(state).toEqual({ count: 0 });
    expect(history.getRedoLabel()).toBe('Increment');

    state = history.redo(state);
    expect(state).toEqual({ count: 1 });
  });

  it('clears redo history when a new action follows undo', () => {
    const history = new HistoryManager<Counter>();
    let state = { count: 0 };
    state = history.apply(state, draft => { draft.count = 1; });
    state = history.undo(state);
    state = history.apply(state, draft => { draft.count = 2; });

    expect(state).toEqual({ count: 2 });
    expect(history.canRedo()).toBe(false);
  });

  it('does not create history for a no-op recipe', () => {
    const history = new HistoryManager<Counter>();
    const state = history.apply({ count: 0 }, draft => {
      draft.count = 1;
      draft.count = 0;
    });

    expect(state).toEqual({ count: 0 });
    expect(history.canUndo()).toBe(false);
  });

  it('undoes a same-field batch in reverse mutation order', () => {
    const history = new HistoryManager<Counter>();
    let state = { count: 0 };
    history.startBatch();
    state = history.apply(state, draft => { draft.count = 1; });
    state = history.apply(state, draft => { draft.count = 2; });
    state = history.apply(state, draft => { draft.count = 3; }, { label: 'Drag' });
    history.endBatch();

    expect(history.getUndoLabel()).toBe('Drag');
    expect(history.canUndo()).toBe(true);
    state = history.undo(state);
    expect(state).toEqual({ count: 0 });
    expect(history.canUndo()).toBe(false);
  });

  it('merges nearby actions but keeps actions outside the window separate', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const merged = new HistoryManager<Counter>({ mergeWindowMs: 500 });
    let mergedState = { count: 0 };
    mergedState = merged.apply(mergedState, draft => { draft.count = 1; });
    vi.advanceTimersByTime(400);
    mergedState = merged.apply(mergedState, draft => { draft.count = 2; });
    expect(merged.undo(mergedState)).toEqual({ count: 0 });

    const separate = new HistoryManager<Counter>({ mergeWindowMs: 500 });
    let separateState = { count: 0 };
    separateState = separate.apply(separateState, draft => { draft.count = 1; });
    vi.advanceTimersByTime(600);
    separateState = separate.apply(separateState, draft => { draft.count = 2; });
    separateState = separate.undo(separateState);
    expect(separateState).toEqual({ count: 1 });
    expect(separate.undo(separateState)).toEqual({ count: 0 });
  });

  it('evicts the oldest history entry when maxHistorySize is exceeded', () => {
    const history = new HistoryManager<Counter>({ maxHistorySize: 2 });
    let state = { count: 0 };
    state = history.apply(state, draft => { draft.count = 1; });
    state = history.apply(state, draft => { draft.count = 2; });
    state = history.apply(state, draft => { draft.count = 3; });
    state = history.undo(state);
    state = history.undo(state);

    expect(state).toEqual({ count: 1 });
    expect(history.canUndo()).toBe(false);
  });

  it('notifies subscribers and supports unsubscribe', () => {
    const history = new HistoryManager<Counter>();
    const listener = vi.fn();
    const unsubscribe = history.subscribe(listener);
    let state = { count: 0 };
    state = history.apply(state, draft => { draft.count = 1; });
    state = history.undo(state);
    state = history.redo(state);
    history.clear();
    expect(listener).toHaveBeenCalledTimes(4);

    unsubscribe();
    history.apply(state, draft => { draft.count = 2; });
    expect(listener).toHaveBeenCalledTimes(4);
  });
});
