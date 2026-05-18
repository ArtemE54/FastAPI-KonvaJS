import { CONFIG, TOOLS } from './config.js';
import { createStage, applyCanvasStyles, updateStageSize } from './canva.js';
import { handleTransform } from './transform.js';
import { currentTool, setCurrentTool, createShape, updateShape } from './tools.js';
import { saveState, loadState, undo, redo, clearHistory, history, historyIndex } from './state.js';
import { updateHistoryPanel } from './history-panel.js';
import {
    isEditingText, setIsEditingText, currentTextNode, pendingStagePos,
    currentFontFamily, currentFontSize, setCurrentFontFamily, setCurrentFontSize,
    showTextEditor, hideTextEditor, updateSelectedTextProps, syncFontPicker
} from './text-editor.js';
import { exportToSVG } from './export.js';
import { setupKeyboardEvents, setupToolbarEvents } from './event.js';
import { snap } from './utils.js';

//Глобальные переменные
let stage, layer, transformer, container;
let GRID_SIZE = CONFIG.GRID.DEFAULT_SIZE;
let isDrawing = false;
let currentDrawingShape = null;
let startX = 0, startY = 0;

// DOM элементы
const colorPicker = document.getElementById('color-picker');
const bgPicker = document.getElementById('bg-color');
const gridPicker = document.getElementById('grid-color');
const sizeDisplay = document.getElementById('grid-size-display');
const fontFamilySelect = document.getElementById('font-family-select');
const fontSizeInput = document.getElementById('font-size-input');
const arcRadiusInput = document.getElementById('arc-radius');
const arcAngleInput = document.getElementById('arc-angle');
const textOverlay = document.getElementById('text-overlay');
const textInput = document.getElementById('text-input');

//Вспомогательные функции
function attachNodeEvents(node) {
    if (!node) return;
    node.draggable(true);
    if (node.getClassName() !== 'Text') {
        node.dragBoundFunc(pos => ({ x: snap(pos.x, GRID_SIZE), y: snap(pos.y, GRID_SIZE) }));
    }
    node.on('click tap', (e) => {
        e.cancelBubble = true;
        transformer.nodes([node]);
        layer.batchDraw();
        syncColorPickerWithSelection();
        syncFontPicker(transformer, fontFamilySelect, fontSizeInput);
    });
    node.on('dragend', () => {
        saveState(layer, transformer, '↔️ Перемещение', isEditingText, hideTextEditorWrapper);
        updateUndoRedoButtons();
    });
    if (node.getClassName() === 'Text') {
        node.on('dblclick dbltap', (e) => {
            e.cancelBubble = true;
            const pos = e.evt || e;
            const clientX = pos.clientX || (stage.getPointerPosition()?.x || 0);
            const clientY = pos.clientY || (stage.getPointerPosition()?.y || 0);
            showTextEditor(textOverlay, textInput, clientX, clientY, node.text(), node, colorPicker.value);
        });
    }
}

function syncColorPickerWithSelection() {
    const nodes = transformer.nodes();
    if (nodes.length === 0) return;
    const color = nodes[0].stroke();
    if (color) colorPicker.value = color;
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    if (undoBtn) undoBtn.disabled = historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = historyIndex >= history.length - 1;
}

function hideTextEditorWrapper(save = false) {
    hideTextEditor(textOverlay, save, textInput, currentTextNode, pendingStagePos, layer, transformer, attachNodeEvents, colorPicker, currentFontFamily, currentFontSize);
    if (save) {
        saveState(layer, transformer, '🔤 Ввод текста', isEditingText, hideTextEditorWrapper);
    }
    updateUndoRedoButtons();
}

function applyColorToSelected() {
    const nodes = transformer.nodes();
    if (nodes.length === 0) return;
    const col = colorPicker.value;
    nodes.forEach(node => {
        node.stroke(col);
        if (node.getClassName() === 'Text') {
            node.fill(col);
        } else {
            if (node.fill && node.fill() !== 'none' && node.fill() !== 'transparent') {
                node.fill(col + '44');
            }
        }
    });
    layer.batchDraw();
    saveState(layer, transformer, '🎨 Изменение цвета', isEditingText, hideTextEditorWrapper);
    updateUndoRedoButtons();
}

function deleteSelected() {
    if (isEditingText) return;
    const nodes = transformer.nodes();
    if (nodes.length === 0) return;
    nodes.forEach(n => n.destroy());
    transformer.nodes([]);
    layer.batchDraw();
    saveState(layer, transformer, '🗑 Удаление', isEditingText, hideTextEditorWrapper);
    updateUndoRedoButtons();
}

function updateGridSize(newSize) {
    if (isEditingText) hideTextEditorWrapper(false);
    GRID_SIZE = Math.max(CONFIG.GRID.MIN_SIZE, Math.min(CONFIG.GRID.MAX_SIZE, newSize));
    if (sizeDisplay) sizeDisplay.textContent = GRID_SIZE;
    layer.getChildren().forEach(node => {
        if (node !== transformer && node.getClassName() !== 'Text') {
            node.x(snap(node.x(), GRID_SIZE));
            node.y(snap(node.y(), GRID_SIZE));
            if (node.width !== undefined) {
                node.width(snap(node.width(), GRID_SIZE));
                node.height(snap(node.height(), GRID_SIZE));
            }
            if (node.radius !== undefined) node.radius(snap(node.radius(), GRID_SIZE));
        }
    });
    layer.batchDraw();
    applyCanvasStyles(container, bgPicker.value, gridPicker.value, GRID_SIZE);
    saveState(layer, transformer, '📏 Изменение сетки', isEditingText, hideTextEditorWrapper);
    updateUndoRedoButtons();
}

//Рисование
function startDrawing(e) {
    if (isEditingText || currentTool === TOOLS.POINTER) return;
    if (currentTool === TOOLS.TEXT) {
        const pos = stage.getPointerPosition();
        if (pos) {
            pendingStagePos.x = snap(pos.x, GRID_SIZE);
            pendingStagePos.y = snap(pos.y, GRID_SIZE);
        }
        const clientX = e.evt ? e.evt.clientX : (stage.getPointerPosition()?.x || 0);
        const clientY = e.evt ? e.evt.clientY : (stage.getPointerPosition()?.y || 0);
        showTextEditor(textOverlay, textInput, clientX, clientY, '', null, colorPicker.value);
        return;
    }
    isDrawing = true;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    startX = snap(pos.x, GRID_SIZE);
    startY = snap(pos.y, GRID_SIZE);
    currentDrawingShape = createShape(currentTool, startX, startY, GRID_SIZE, parseInt(arcRadiusInput.value), parseInt(arcAngleInput.value));
    if (currentDrawingShape) {
        layer.add(currentDrawingShape);
        attachNodeEvents(currentDrawingShape);
        transformer.nodes([currentDrawingShape]);
        layer.batchDraw();
    }
}

function onMouseMove(e) {
    if (!isDrawing || !currentDrawingShape) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    updateShape(currentTool, currentDrawingShape, startX, startY, pos, GRID_SIZE);
    layer.batchDraw();
}

function stopDrawing() {
    if (isDrawing && currentDrawingShape && currentTool !== TOOLS.TEXT) {
        saveState(layer, transformer, `➕ Создан: ${currentTool}`, isEditingText, hideTextEditorWrapper);
        updateUndoRedoButtons();
    }
    isDrawing = false;
    currentDrawingShape = null;
}

//Привязка UI 
function bindUI() {
    // История
    document.getElementById('undo-btn').addEventListener('click', () => {
        undo(layer, transformer, attachNodeEvents, hideTextEditorWrapper, isEditingText);
        updateUndoRedoButtons();
        updateHistoryPanel();
    });
    document.getElementById('redo-btn').addEventListener('click', () => {
        redo(layer, transformer, attachNodeEvents, hideTextEditorWrapper, isEditingText);
        updateUndoRedoButtons();
        updateHistoryPanel();
    });

    window.addEventListener('loadHistoryState', (e) => {
        loadState(layer, transformer, e.detail.index, attachNodeEvents, hideTextEditorWrapper, isEditingText);
        updateUndoRedoButtons();
        updateHistoryPanel();
    });

    // Экспорт SVG
    document.getElementById('svg-btn').addEventListener('click', () => {
        exportToSVG(layer, transformer, hideTextEditorWrapper, isEditingText);
        saveState(layer, transformer, '📤 Экспорт SVG', isEditingText, hideTextEditorWrapper);
        updateUndoRedoButtons();
    });

    // Очистка
    document.getElementById('clear-btn').addEventListener('click', () => {
        if (isEditingText) hideTextEditorWrapper(false);
        const shapes = layer.getChildren().filter(n => n !== transformer);
        shapes.forEach(n => n.destroy());
        transformer.nodes([]);
        layer.draw();
        clearHistory();
        saveState(layer, transformer, '🧹 Очистка', isEditingText, hideTextEditorWrapper);
        updateUndoRedoButtons();
        updateHistoryPanel();
    });

    // Цвета
    colorPicker.addEventListener('input', applyColorToSelected);
    bgPicker.addEventListener('input', () => applyCanvasStyles(container, bgPicker.value, gridPicker.value, GRID_SIZE));
    gridPicker.addEventListener('input', () => applyCanvasStyles(container, bgPicker.value, gridPicker.value, GRID_SIZE));

    // Сетка
    document.getElementById('grid-inc').addEventListener('click', () => updateGridSize(GRID_SIZE + CONFIG.GRID.STEP));
    document.getElementById('grid-dec').addEventListener('click', () => updateGridSize(GRID_SIZE - CONFIG.GRID.STEP));

    // Текст
    fontFamilySelect.addEventListener('change', (e) => {
        setCurrentFontFamily(e.target.value);
        updateSelectedTextProps(transformer, currentFontFamily, currentFontSize, layer, saveState, isEditingText, hideTextEditorWrapper);
    });
    fontSizeInput.addEventListener('input', (e) => {
        setCurrentFontSize(parseInt(e.target.value) || CONFIG.TEXT.DEFAULT_SIZE);
        updateSelectedTextProps(transformer, currentFontFamily, currentFontSize, layer, saveState, isEditingText, hideTextEditorWrapper);
    });

    // Дуга
    arcRadiusInput.addEventListener('change', () => {
        const nodes = transformer.nodes();
        if (nodes.length === 1 && nodes[0].getClassName() === 'Arc') {
            nodes[0].outerRadius(parseInt(arcRadiusInput.value));
            layer.batchDraw();
            saveState(layer, transformer, '🌙 Изменение радиуса дуги', isEditingText, hideTextEditorWrapper);
            updateUndoRedoButtons();
        }
    });
    arcAngleInput.addEventListener('change', () => {
        const nodes = transformer.nodes();
        if (nodes.length === 1 && nodes[0].getClassName() === 'Arc') {
            nodes[0].angle(parseInt(arcAngleInput.value));
            layer.batchDraw();
            saveState(layer, transformer, '🌙 Изменение угла дуги', isEditingText, hideTextEditorWrapper);
            updateUndoRedoButtons();
        }
    });

    // Инструменты (через event.js)
    setupToolbarEvents((l, t, desc, edit, hide) => {
        saveState(l, t, desc, edit, hide);
        updateUndoRedoButtons();
    }, layer, transformer, () => isEditingText, hideTextEditorWrapper);

    // Удаление
    document.getElementById('delete-btn').addEventListener('click', deleteSelected);
}

// Инициализация
function init() {
    container = document.getElementById('container');
    if (!container) {
        console.error('Container #container not found');
        return;
    }
    const { stage: s, layer: l, transformer: t } = createStage('container');
    stage = s;
    layer = l;
    transformer = t;

    applyCanvasStyles(container, bgPicker.value, gridPicker.value, GRID_SIZE);
    if (sizeDisplay) sizeDisplay.textContent = GRID_SIZE;

    // Трансформация
    transformer.on('transform', (e) => handleTransform(e.target, transformer, GRID_SIZE, fontSizeInput));
    transformer.on('transformend', () => {
        saveState(layer, transformer, '📐 Трансформация', isEditingText, hideTextEditorWrapper);
        updateUndoRedoButtons();
    });

    // События слоя
    layer.on('dragend', () => {
        saveState(layer, transformer, '↔️ Перемещение', isEditingText, hideTextEditorWrapper);
        updateUndoRedoButtons();
    });

    // Рисование
    stage.on('mousedown touchstart', startDrawing);
    stage.on('mousemove touchmove', onMouseMove);
    stage.on('mouseup touchend', stopDrawing);

    // Клик по фону
    stage.on('click tap', (e) => {
        if (e.target === stage && currentTool === TOOLS.POINTER && !isEditingText) {
            transformer.nodes([]);
            layer.batchDraw();
        }
    });

    // Клавиатура
    setupKeyboardEvents(stage, layer, transformer, attachNodeEvents,
        (l, t, desc, edit, hide) => { saveState(l, t, desc, edit, hide); updateUndoRedoButtons(); },
        hideTextEditorWrapper, () => isEditingText, deleteSelected);

    // Ресайз
    window.addEventListener('resize', () => {
        if (updateStageSize) updateStageSize(stage, container);
        layer.batchDraw();
    });

    // Начальное сохранение
    saveState(layer, transformer, '🚀 Старт', isEditingText, hideTextEditorWrapper);
    updateUndoRedoButtons();
    updateHistoryPanel();
}

// Запуск
document.addEventListener('DOMContentLoaded', () => {
    init();
    bindUI();
});

//Интеграция с сервером (SQLite)

// Кнопки
document.getElementById('save-server-btn').addEventListener('click', saveToServer);
document.getElementById('load-server-btn').addEventListener('click', loadFromServer);
document.getElementById('versions-btn').addEventListener('click', showVersionsPanel);

// Функция сохранения
async function saveToServer() {
    const name = prompt('Введите имя сцены:', 'my_scene');
    if (!name) return;

    // Генерируем SVG (можно использовать exportToSVG, но нам нужна строка)
    let svgString = '';
    try {
        // Временно экспортируем SVG без скачивания
        const nodes = layer.getChildren().filter(n => n !== transformer);
        if (nodes.length === 0) {
            alert('Нет объектов для сохранения!');
            return;
        }
        svgString = generateSVGString(layer, transformer);
    } catch(e) {
        console.warn('Не удалось сгенерировать SVG, будет пустая строка');
    }

    const data_json = stage.toJSON();
    try {
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                data_json: JSON.parse(data_json),
                svg: svgString
            })
        });
        const result = await response.json();
        if (response.ok) {
            alert(`Сцена "${name}" сохранена! Версия: ${result.version}`);
        } else {
            alert('Ошибка сохранения: ' + (result.detail || 'неизвестная ошибка'));
        }
    } catch(e) {
        alert('Не удалось соединиться с сервером: ' + e.message);
    }
}

function generateSVGString(layer, transformer) {
    const nodes = layer.getChildren().filter(n => n !== transformer);
    if (nodes.length === 0) return '';
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(node => {
        const box = node.getClientRect();
        minX = Math.min(minX, box.x);
        minY = Math.min(minY, box.y);
        maxX = Math.max(maxX, box.x + box.width);
        maxY = Math.max(maxY, box.y + box.height);
    });
    const padding = 10;
    minX -= padding; minY -= padding; maxX += padding; maxY += padding;
    const width = maxX - minX, height = maxY - minY;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">`;
    svg += `<rect width="100%" height="100%" fill="none"/>`;
    nodes.forEach(node => {
        const a = node.attrs;
        const x = a.x || 0, y = a.y || 0, rot = a.rotation || 0;
        const transform = (x || y || rot) ? ` transform="translate(${x},${y}) rotate(${rot})"` : '';
        const stroke = a.stroke || '#888', sw = a.strokeWidth || 2, fill = a.fill || 'none';
        let el = '';
        if (node.className === 'Rect') {
            el = `<rect x="0" y="0" width="${a.width}" height="${a.height}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}"${transform}/>`;
        } else if (node.className === 'Circle') {
            el = `<circle cx="0" cy="0" r="${a.radius}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}"${transform}/>`;
        } else if (node.className === 'Line' && a.points && a.points.length >= 4) {
            el = `<polyline points="${a.points.join(' ')}" stroke="${stroke}" stroke-width="${sw}" fill="none"${transform}/>`;
        } else if (node.className === 'Arc' && a.outerRadius) {
            const r = a.outerRadius;
            const angle = a.angle || 90;
            const startAngle = 0;
            const endAngle = angle * Math.PI / 180;
            const x1 = Math.cos(startAngle) * r;
            const y1 = Math.sin(startAngle) * r;
            const x2 = Math.cos(endAngle) * r;
            const y2 = Math.sin(endAngle) * r;
            const largeArc = Math.abs(angle) > 180 ? 1 : 0;
            const sweep = 1;
            el = `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${sweep} ${x2} ${y2}" stroke="${stroke}" stroke-width="${sw}" fill="none"${transform}/>`;
        } else if (node.className === 'Text') {
            const safeText = (a.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const fontSize = a.fontSize || 16;
            const fontFamily = a.fontFamily || 'Arial';
            el = `<text x="0" y="0" font-family="${fontFamily}" font-size="${fontSize}" fill="${fill}" text-anchor="start" dominant-baseline="hanging"${transform}>${safeText}</text>`;
        }
        if (el) svg += el;
    });
    svg += '</svg>';
    return svg;
}

// Функция загрузки
async function loadFromServer() {
    // Получаем список сцен
    try {
        const response = await fetch('/api/load');
        const data = await response.json();
        if (!response.ok || !data.scenes || data.scenes.length === 0) {
            alert('Нет сохранённых сцен');
            return;
        }
        showSceneSelection(data.scenes);
    } catch(e) {
        alert('Ошибка получения списка сцен: ' + e.message);
    }
}

function showSceneSelection(scenes) {
    const panel = document.getElementById('server-panel');
    const content = document.getElementById('server-panel-content');
    panel.style.display = 'block';
    let html = '<p>Выберите сцену:</p><ul style="list-style:none;padding:0;">';
    scenes.forEach(scene => {
        html += `<li style="padding:8px;margin:4px 0;background:#3a3a3a;border-radius:6px;cursor:pointer;" 
                    onclick="loadSpecificScene('${scene.name}', ${scene.latest_version})">
                    ${scene.name} (последняя версия: ${scene.latest_version})
                </li>`;
    });
    html += '</ul>';
    content.innerHTML = html;
    document.getElementById('server-panel-title').textContent = 'Выберите сцену для загрузки';
}

// Глобальная функция для загрузки конкретной сцены
window.loadSpecificScene = async function(name, version) {
    document.getElementById('server-panel').style.display = 'none';
    try {
        const response = await fetch(`/api/load?name=${encodeURIComponent(name)}&version=${version}`);
        if (!response.ok) {
            alert('Не удалось загрузить сцену');
            return;
        }
        const data = await response.json();
        // Восстанавливаем сцену
        stage.destroy();
        const newStage = Konva.Node.create(JSON.stringify(data.data_json), 'container');
        stage = newStage;
        layer = stage.getLayers()[0];
        transformer = layer.find('Transformer')[0];
        if (!transformer) {
            transformer = new Konva.Transformer({
                rotateEnabled: true,
                borderStroke: CONFIG.COLORS.TRANSFORMER_BORDER,
                anchorSize: 8
            });
            layer.add(transformer);
        }
        // Перепривязываем события
        layer.getChildren().forEach(node => {
            if (node !== transformer) attachNodeEvents(node);
        });
        stage.on('click tap', (e) => {
            if (e.target === stage && currentTool === TOOLS.POINTER && !isEditingText) {
                transformer.nodes([]);
                layer.batchDraw();
            }
        });
        // Восстанавливаем обработчики трансформации
        transformer.on('transform', (e) => handleTransform(e.target, transformer, GRID_SIZE, fontSizeInput));
        transformer.on('transformend', () => {
            saveState(layer, transformer, '📐 Трансформация', isEditingText, hideTextEditorWrapper);
            updateUndoRedoButtons();
        });
        layer.on('dragend', () => {
            saveState(layer, transformer, '↔️ Перемещение', isEditingText, hideTextEditorWrapper);
            updateUndoRedoButtons();
        });
        // Сбрасываем историю
        clearHistory();
        saveState(layer, transformer, `📂 Загружено: ${data.name} v${data.version}`, isEditingText, hideTextEditorWrapper);
        updateUndoRedoButtons();
        updateHistoryPanel();
        alert(`Сцена "${data.name}" версии ${data.version} загружена`);
    } catch(e) {
        alert('Ошибка загрузки: ' + e.message);
    }
};

// Панель версий
async function showVersionsPanel() {
    const name = prompt('Введите имя сцены для просмотра версий:');
    if (!name) return;
    try {
        const response = await fetch(`/api/versions?name=${encodeURIComponent(name)}`);
        if (!response.ok) {
            alert('Сцена не найдена');
            return;
        }
        const data = await response.json();
        const panel = document.getElementById('server-panel');
        const content = document.getElementById('server-panel-content');
        panel.style.display = 'block';
        let html = `<h3>Версии сцены "${data.name}"</h3><ul style="list-style:none;padding:0;">`;
        data.versions.forEach(v => {
            html += `<li style="padding:8px;margin:4px 0;background:#3a3a3a;border-radius:6px;cursor:pointer;" 
                        onclick="loadSpecificScene('${data.name}', ${v.version})">
                        Версия ${v.version} (ID: ${v.id})
                    </li>`;
        });
        html += '</ul>';
        content.innerHTML = html;
        document.getElementById('server-panel-title').textContent = 'Выберите версию';
    } catch(e) {
        alert('Ошибка получения версий: ' + e.message);
    }
}

// Кнопка закрытия панели
document.getElementById('server-panel-close').addEventListener('click', () => {
    document.getElementById('server-panel').style.display = 'none';
});
