# immer-patch-history-engine

A framework-agnostic undo/redo manager that records compact [Immer](https://immerjs.github.io/immer/) patches instead of whole-state snapshots. It works with any object state and has no UI or application-domain dependencies.

## Install

```bash
npm install immer-patch-history-engine immer
```

`immer` is a peer dependency so your application owns its version.

## Basic usage

```ts
import { HistoryManager } from 'immer-patch-history-engine';

type State = { count: number };
const history = new HistoryManager<State>();
let state = { count: 0 };

state = history.apply(state, draft => { draft.count += 1; }, { label: 'Increment' });
state = history.undo(state); // { count: 0 }
state = history.redo(state); // { count: 1 }
```

## Batching a gesture

Use explicit batching for multiple updates that should undo as one action. Inverse patches are prepended while accumulating, so replaying them reverses same-path changes correctly.

```ts
history.startBatch();
state = history.apply(state, draft => { draft.position.x = 10; });
state = history.apply(state, draft => { draft.position.x = 20; });
history.endBatch();
state = history.undo(state); // returns to the value before the batch
```

## Merge recent changes

For typing-style interactions, merge adjacent non-batched actions made within a time window.

```ts
const history = new HistoryManager<{ text: string }>({ mergeWindowMs: 500 });
state = history.apply(state, draft => { draft.text += 'a'; });
state = history.apply(state, draft => { draft.text += 'b'; });
// One undo removes both changes when they occur within 500 ms.
```

## API

| Method | Signature | Description |
| --- | --- | --- |
| `apply` | `(state, recipe, options?) => T` | Produces next state and records patches unless the recipe is a no-op. |
| `undo` | `(state) => T` | Applies the newest inverse patch entry. |
| `redo` | `(state) => T` | Reapplies the newest redo entry. |
| `canUndo` | `() => boolean` | Whether an undo entry exists. |
| `canRedo` | `() => boolean` | Whether a redo entry exists. |
| `startBatch` | `() => void` | Begins one grouped history entry. |
| `endBatch` | `() => void` | Commits the current grouped entry, if it changed state. |
| `getUndoLabel` | `() => string \| undefined` | Label of the next action to undo. |
| `getRedoLabel` | `() => string \| undefined` | Label of the next action to redo. |
| `subscribe` | `(listener) => unsubscribe` | Watches history changes. |
| `clear` | `() => void` | Removes undo and redo entries. |

### Constructor options

| Option | Default | Description |
| --- | --- | --- |
| `maxHistorySize` | `100` | Maximum completed undo entries; oldest entries are evicted first. |
| `mergeWindowMs` | none | Milliseconds within which consecutive non-batched actions are grouped. |

## Notes

History entries are plain JSON-serializable patches, though persistence is intentionally not included. Future work may add framework adapters for React, Vue, and Svelte.

## Development

```bash
npm run build
npm run test
```

