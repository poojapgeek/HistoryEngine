import { HistoryManager } from '../../dist/index.js';
const history = new HistoryManager({ mergeWindowMs: 500 }), input = document.querySelector('#text');
let state = { text: '' };
input.oninput = () => { state = history.apply(state, d => { d.text = input.value; }, { label: 'Type' }); };
const render = () => { input.value = state.text; };
document.querySelector('#undo').onclick = () => { state = history.undo(state); render(); };
document.querySelector('#redo').onclick = () => { state = history.redo(state); render(); };
