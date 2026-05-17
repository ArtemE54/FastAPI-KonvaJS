// 🔤 Редактор текста
import { CONFIG } from './config.js';

export let isEditingText = false;
export let currentTextNode = null;
export let pendingStagePos = { x: 0, y: 0 };
export let currentFontFamily = CONFIG.TEXT.DEFAULT_FONT;
export let currentFontSize = CONFIG.TEXT.DEFAULT_SIZE;

export function setIsEditingText(value) {
    isEditingText = value;
}

export function getIsEditingText() {
    return isEditingText;
}

export function setCurrentFontFamily(font) {
    currentFontFamily = font;
}

export function setCurrentFontSize(size) {
    currentFontSize = size;
}

export function getCurrentFontFamily() {
    return currentFontFamily;
}

export function getCurrentFontSize() {
    return currentFontSize;
}

export function showTextEditor(textOverlay, textInput, clientX, clientY, initialValue = '', targetNode = null, colorValue = '#888888') {
    if (isEditingText) hideTextEditor(textOverlay, false);

    currentTextNode = targetNode;
    isEditingText = true;
    textInput.value = initialValue;
    textOverlay.style.display = 'flex';
    textOverlay.style.left = `${clientX}px`;
    textOverlay.style.top = `${clientY}px`;
    textOverlay.style.width = `${Math.max(initialValue.length * 10, 60)}px`;
    textOverlay.style.height = '30px';

    if (targetNode) {
        textInput.style.fontSize = targetNode.fontSize() + 'px';
        textInput.style.color = targetNode.fill();
        textInput.style.fontFamily = targetNode.fontFamily();
        currentFontFamily = targetNode.fontFamily();
        currentFontSize = targetNode.fontSize();
    } else {
        textInput.style.fontSize = currentFontSize + 'px';
        textInput.style.color = colorValue;
        textInput.style.fontFamily = currentFontFamily;
    }

    textInput.focus();
    textInput.select();
}

export function hideTextEditor(textOverlay, save = false, textInput, currentTextNodeRef, pendingStagePosRef, layer, transformer, setupNode, colorPicker, currentFontFamilyVal, currentFontSizeVal) {
    if (!isEditingText) return;

    if (save && textInput && textInput.value.trim() !== '') {
        const val = textInput.value.trim();

        if (currentTextNodeRef) {
            currentTextNodeRef.text(val);
            currentTextNodeRef.width(currentTextNodeRef.getTextWidth() + 4);
        } else {
            const newText = new Konva.Text({
                x: pendingStagePosRef.x,
                y: pendingStagePosRef.y,
                text: val,
                fontSize: currentFontSizeVal,
                fontFamily: currentFontFamilyVal,
                fill: colorPicker ? colorPicker.value : '#888888',
                draggable: true,
                listening: true,
                name: 'ugo-text',
                align: 'center'
            });
            layer.add(newText);
            if (setupNode) setupNode(newText);
            if (transformer) transformer.nodes([newText]);
        }
        layer.batchDraw();
    }

    if (textOverlay) textOverlay.style.display = 'none';
    isEditingText = false;
    currentTextNode = null;
}

export function updateSelectedTextProps(transformer, fontFamily, fontSize, layer, saveStateFunc, isEditingTextFlag, hideTextEditorFunc) {
    const nodes = transformer.nodes();
    let changed = false;

    nodes.forEach(node => {
        if (node.getClassName() === 'Text') {
            node.fontFamily(fontFamily);
            node.fontSize(fontSize);
            node.width(node.getTextWidth() + 4);
            changed = true;
        }
    });

    if (changed && layer && saveStateFunc) {
        layer.batchDraw();
        saveStateFunc(layer, transformer, '🔤 Изменение текста', isEditingTextFlag, hideTextEditorFunc);
    }

    return changed;
}

export function syncFontPicker(transformer, fontFamilySelect, fontSizeInput) {
    const nodes = transformer.nodes();
    if (nodes.length === 1 && nodes[0].getClassName() === 'Text') {
        const t = nodes[0];
        if (fontFamilySelect) fontFamilySelect.value = t.fontFamily();
        if (fontSizeInput) fontSizeInput.value = t.fontSize();
        currentFontFamily = t.fontFamily();
        currentFontSize = t.fontSize();
        return {
            fontFamily: t.fontFamily(),
            fontSize: t.fontSize()
        };
    }
    return null;
}