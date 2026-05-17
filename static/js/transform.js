// 📐 Трансформация и привязка к сетке
import { snap } from './utils.js';
import { CONFIG } from './config.js';

export function setupNode(node, gridSize, transformer, stage, currentTool, isEditingText, layer, showTextEditorCallback) {
    if (!node) return;

    node._isSnapping = false;
    node.listening(true);
    node.draggable(true);

    if (node.getClassName() !== 'Text') {
        node.dragBoundFunc(pos => ({
            x: snap(pos.x, gridSize),
            y: snap(pos.y, gridSize)
        }));
    }

    node.on('mousedown', function(e) {
        if (currentTool === 'pointer' && !isEditingText) {
            e.cancelBubble = true;
            transformer.nodes([this]);
            layer.batchDraw();
        }
    });

    if (node.getClassName() === 'Text') {
        node.on('dblclick', function(e) {
            e.cancelBubble = true;
            if (showTextEditorCallback) {
                const pos = e.evt ? { clientX: e.evt.clientX, clientY: e.evt.clientY } : { clientX: 0, clientY: 0 };
                showTextEditorCallback(pos.clientX, pos.clientY, this.text(), this);
            }
        });
        node.on('mouseover', () => {
            if (currentTool === 'pointer') stage.container().style.cursor = 'text';
        });
        node.on('mouseout', () => {
            if (currentTool === 'pointer') stage.container().style.cursor = 'default';
        });
    } else {
        node.on('mouseover', () => {
            if (currentTool === 'pointer') stage.container().style.cursor = 'move';
        });
        node.on('mouseout', () => {
            if (currentTool === 'pointer') stage.container().style.cursor = 'default';
        });
    }
}

export function handleTransform(node, transformer, gridSize, fontSizeInput) {
    if (node.getClassName() === 'Text') {
        const sx = node.scaleX();
        const sy = node.scaleY();

        if (sx !== 1 || sy !== 1) {
            const avgScale = (sx + sy) / 2;
            const currentSize = node.fontSize();
            const newSize = Math.max(CONFIG.TEXT.MIN_SIZE, Math.round(currentSize * avgScale));

            node.fontSize(newSize);
            node.scaleX(1);
            node.scaleY(1);

            if (fontSizeInput) {
                fontSizeInput.value = newSize;
            }

            node.width(node.getTextWidth() + 4);
            transformer.forceUpdate();
        }
        return;
    }

    if (node._isSnapping) return;
    node._isSnapping = true;

    const sx = node.scaleX();
    const sy = node.scaleY();

    if (sx !== 1 || sy !== 1) {
        node.scaleX(1);
        node.scaleY(1);

        if (node.width !== undefined) {
            node.width(Math.max(gridSize, snap(node.width() * sx, gridSize)));
            node.height(Math.max(gridSize, snap(node.height() * sy, gridSize)));
        }

        if (node.radius !== undefined) {
            node.radius(Math.max(gridSize / 2, snap(node.radius() * Math.max(sx, sy), gridSize)));
        }

        if (node.points !== undefined) {
            const p = node.points();
            if (p.length >= 4) {
                p[2] = snap(p[2], gridSize);
                p[3] = snap(p[3], gridSize);
                node.points(p);
            }
        }
        
        node.x(snap(node.x(), gridSize));
        node.y(snap(node.y(), gridSize));
        transformer.forceUpdate();
    }
    
    node._isSnapping = false;
}