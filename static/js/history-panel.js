// 📜 Панель истории действий
import { history, historyIndex, loadState } from './state.js';

export function updateHistoryPanel() {
    const historyListEl = document.getElementById('history-list');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    
    if (!historyListEl) return;
    
    historyListEl.innerHTML = '';

    history.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'history-item';

        if (index === historyIndex) {
            li.classList.add('active');
        } else if (index > historyIndex) {
            li.classList.add('disabled');
        }

        const time = new Date(item.timestamp).toLocaleTimeString();
        li.textContent = `${index + 1}. ${item.description} (${time})`;
        li.dataset.index = index;

        li.onclick = (e) => {
            e.stopPropagation();
            if (index !== historyIndex && !li.classList.contains('disabled')) {
                const event = new CustomEvent('loadHistoryState', { detail: { index } });
                window.dispatchEvent(event);
            }
        };

        historyListEl.appendChild(li);
    });

    const activeItem = historyListEl.querySelector('.history-item.active');
    if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    if (undoBtn) undoBtn.disabled = historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = historyIndex >= history.length - 1;
}

export function addHistoryItem(description) {
    updateHistoryPanel();
}

export function clearHistoryPanel() {
    const historyListEl = document.getElementById('history-list');
    if (historyListEl) {
        historyListEl.innerHTML = '';
    }
}
