import { applyPatches, enablePatches, produceWithPatches } from 'immer';
import type { Objectish } from 'immer';
import type { ApplyOptions, HistoryEntry, HistoryManagerOptions, HistoryRecipe } from './types';

// Immer keeps this switch globally; enabling it is idempotent.
enablePatches();

/** Framework-agnostic, patch-based undo/redo manager. */
export class HistoryManager<T extends Objectish> {
  private readonly maxHistorySize: number;
  private readonly mergeWindowMs?: number;
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private listeners = new Set<() => void>();
  private batching = false;
  private pendingEntry?: HistoryEntry;
  private lastApplyTime = 0;

  constructor(options: HistoryManagerOptions = {}) {
    this.maxHistorySize = Math.max(0, Math.floor(options.maxHistorySize ?? 100));
    this.mergeWindowMs = options.mergeWindowMs;
  }

  apply(state: T, recipe: HistoryRecipe<T>, options: ApplyOptions = {}): T {
    const [nextState, patches, inversePatches] = produceWithPatches(state, recipe);
    if (patches.length === 0) {
      this.notify();
      return nextState;
    }

    const entry: HistoryEntry = { patches, inversePatches, label: options.label };
    this.redoStack = [];

    if (this.batching) {
      this.appendToPendingEntry(entry);
    } else if (this.shouldMerge()) {
      this.appendToEntry(this.undoStack[this.undoStack.length - 1], entry);
    } else {
      this.pushUndoEntry(entry);
    }

    this.lastApplyTime = Date.now();
    this.notify();
    return nextState;
  }

  undo(state: T): T {
    const entry = this.undoStack.pop();
    if (!entry) {
      this.notify();
      return state;
    }

    this.redoStack.push(entry);
    this.lastApplyTime = 0;
    this.notify();
    return applyPatches(state, entry.inversePatches);
  }

  redo(state: T): T {
    const entry = this.redoStack.pop();
    if (!entry) {
      this.notify();
      return state;
    }

    this.undoStack.push(entry);
    this.lastApplyTime = 0;
    this.notify();
    return applyPatches(state, entry.patches);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  startBatch(): void {
    if (this.batching) return;
    this.batching = true;
    this.pendingEntry = undefined;
    this.lastApplyTime = 0;
  }

  endBatch(): void {
    if (!this.batching) return;
    this.batching = false;
    if (this.pendingEntry) this.pushUndoEntry(this.pendingEntry);
    this.pendingEntry = undefined;
    this.lastApplyTime = 0;
    this.notify();
  }

  getUndoLabel(): string | undefined {
    return this.undoStack[this.undoStack.length - 1]?.label;
  }

  getRedoLabel(): string | undefined {
    return this.redoStack[this.redoStack.length - 1]?.label;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.pendingEntry = undefined;
    this.lastApplyTime = 0;
    this.notify();
  }

  private shouldMerge(): boolean {
    return Boolean(
      this.mergeWindowMs !== undefined &&
        this.undoStack.length > 0 &&
        Date.now() - this.lastApplyTime < this.mergeWindowMs
    );
  }

  private appendToPendingEntry(entry: HistoryEntry): void {
    if (!this.pendingEntry) {
      this.pendingEntry = entry;
      return;
    }
    this.appendToEntry(this.pendingEntry, entry);
  }

  private appendToEntry(target: HistoryEntry, next: HistoryEntry): void {
    target.patches.push(...next.patches);
    // Inverses run in reverse chronological order when the entry is undone.
    target.inversePatches.unshift(...next.inversePatches);
    if (next.label !== undefined) target.label = next.label;
  }

  private pushUndoEntry(entry: HistoryEntry): void {
    this.undoStack.push(entry);
    while (this.undoStack.length > this.maxHistorySize) this.undoStack.shift();
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
