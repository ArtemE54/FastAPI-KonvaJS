// ⌨️ Обработчики событий
import { TOOLS } from './config.js';
import { currentTool, setCurrentTool } from './tools.js';
import { undo, redo, copyToClipboard, cutToClipboard, pasteFromClipboard, clipboard } from './state.js';

export function setupKeyboardEvents(stage, layer, transformer, setupNode, saveStateFunc, hideTextEditor, isEditingTextFunc, deleteSelected) {
    window.addEventListener('keydown', (e) => {
        if (isEditingTextFunc && isEditingTextFunc()) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (hideTextEditor) hideTextEditor(null, true);
                if (saveStateFunc) saveStateFunc(layer, transformer, '🔤 Ввод текста', true, hideTextEditor);
            }
            if (e.key === 'Escape') {
                if (hideTextEditor) hideTextEditor(null, false);
            }
            return;
        }

        const isCtrl = e.ctrlKey || e.metaKey;

        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            if (deleteSelected) deleteSelected();
        }

        if (isCtrl && e.key === 'z') {
            e.preventDefault();
            if (undo) undo(layer, transformer, setupNode, hideTextEditor, isEditingTextFunc ? isEditingTextFunc() : false);
        }
        if (isCtrl && e.key === 'y') {
            e.preventDefault();
            if (redo) redo(layer, transformer, setupNode, hideTextEditor, isEditingTextFunc ? isEditingTextFunc() : false);
        }

        if (isCtrl && e.key === 'c') {
            e.preventDefault();
            if (copyToClipboard) copyToClipboard(transformer);
        }
        if (isCtrl && e.key === 'v') {
            e.preventDefault();
            if (pasteFromClipboard) pasteFromClipboard(layer, transformer, setupNode, saveStateFunc, isEditingTextFunc ? isEditingTextFunc() : false, hideTextEditor);
        }
        if (isCtrl && e.key === 'x') {
            e.preventDefault();
            if (cutToClipboard) cutToClipboard(transformer, layer, saveStateFunc, isEditingTextFunc ? isEditingTextFunc() : false, hideTextEditor);
        }

        if (e.key.toLowerCase() === 'r' || e.key === 'к') {
            e.preventDefault();
            const nodes = transformer.nodes();
            if (nodes.length > 0) {
                nodes.forEach(n => n.rotation((n.rotation() || 0) + 45));
                layer.batchDraw();
                if (saveStateFunc) saveStateFunc(layer, transformer, '🔄 Вращение', isEditingTextFunc ? isEditingTextFunc() : false, hideTextEditor);
            }
        }
    });
}

export function setupToolbarEvents(saveStateFunc, layer, transformer, isEditingTextFunc, hideTextEditor) {
    document.querySelectorAll('.toolbar button[data-tool], #pointer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.toolbar button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tool = btn.id === 'pointer-btn' ? TOOLS.POINTER : btn.dataset.tool;
            setCurrentTool(tool);

            if (saveStateFunc) {
                saveStateFunc(layer, transformer, '🛠 Выбор инструмента', isEditingTextFunc ? isEditingTextFunc() : false, hideTextEditor);
            }
        });
    });
}

export function setupCanvasEvents(stage, transformer, layer, currentToolGetter, isEditingTextGetter) {
    if (stage) {
        stage.on('click tap', (e) => {
            if (e.target === stage && currentToolGetter() === TOOLS.POINTER && !isEditingTextGetter()) {
                transformer.nodes([]);
                layer.batchDraw();
            }
        });
    }
}