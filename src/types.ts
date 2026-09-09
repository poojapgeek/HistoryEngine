import type { Draft, Objectish, Patch } from 'immer';

export type HistoryRecipe<T extends Objectish> = (draft: Draft<T>) => void;

export interface ApplyOptions {
  label?: string;
}

export interface HistoryManagerOptions {
  /** Maximum number of completed undo entries retained. Defaults to 100. */
  maxHistorySize?: number;
  /** Merge adjacent non-batched changes made within this many milliseconds. */
  mergeWindowMs?: number;
}

export interface HistoryEntry {
  patches: Patch[];
  inversePatches: Patch[];
  label?: string;
}
