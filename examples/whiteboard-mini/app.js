import { HistoryManager } from '../../dist/index.js';
const history = new HistoryManager(), canvas = document.querySelector('#board'), ctx = canvas.getContext('2d');
let state = { rect: { x: 40, y: 50, w: 120, h: 75 } }, drag;
function render() { ctx.clearRect(0, 0, 500, 250); ctx.fillStyle = '#38bdf8'; ctx.fillRect(state.rect.x, state.rect.y, state.rect.w, state.rect.h); }
canvas.onpointerdown = e => { const r = state.rect, x = e.offsetX, y = e.offsetY; if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { drag = { x: x - r.x, y: y - r.y }; history.startBatch(); canvas.setPointerCapture(e.pointerId); } };
canvas.onpointermove = e => { if (drag) { state = history.apply(state, d => { d.rect.x = e.offsetX - drag.x; d.rect.y = e.offsetY - drag.y; }, { label: 'Move rectangle' }); render(); } };
canvas.onpointerup = () => { if (drag) history.endBatch(); drag = undefined; };
document.querySelector('#undo').onclick = () => { state = history.undo(state); render(); };
document.querySelector('#redo').onclick = () => { state = history.redo(state); render(); };
render();
