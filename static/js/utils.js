// 🛠 Вспомогательные функции
import { CONFIG } from './config.js';

export function snap(value, gridSize = CONFIG.GRID.DEFAULT_SIZE) {
    return Math.round(value / gridSize) * gridSize;
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function generateId() {
    return `_${Math.random().toString(36).substr(2, 9)}`;
}

export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}