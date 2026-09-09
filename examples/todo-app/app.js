import { HistoryManager } from '../../dist/index.js';
const history = new HistoryManager(), input = document.querySelector('#text'), list = document.querySelector('#list');
let state = { todos: [] };
const change = (recipe, label) => { state = history.apply(state, recipe, { label }); render(); };
function render() {
  list.innerHTML = state.todos.map((todo, i) => `<li><label><input data-i="${i}" type="checkbox" ${todo.done ? 'checked' : ''}> ${todo.text}</label> <button data-delete="${i}">×</button></li>`).join('');
}
document.querySelector('#add').onclick = () => { if (input.value) change(d => { d.todos.push({ id: crypto.randomUUID(), text: input.value, done: false }); }, 'Add todo'); input.value = ''; };
list.onchange = e => { if (e.target.dataset.i) change(d => { d.todos[e.target.dataset.i].done = e.target.checked; }, 'Toggle todo'); };
list.onclick = e => { if (e.target.dataset.delete) change(d => { d.todos.splice(e.target.dataset.delete, 1); }, 'Delete todo'); };
document.querySelector('#undo').onclick = () => { state = history.undo(state); render(); };
document.querySelector('#redo').onclick = () => { state = history.redo(state); render(); };
render();
