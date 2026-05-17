// 🎨 Инициализация Konva сцены
import { CONFIG } from './config.js';

export function createStage(containerId) {
    const container = document.getElementById(containerId);
    
    const stage = new Konva.Stage({
        container: containerId,
        width: container.clientWidth,
        height: container.clientHeight
    });
    
    const layer = new Konva.Layer();
    stage.add(layer);
    
    const transformer = new Konva.Transformer({
        rotateEnabled: true,
        keepRatio: false,
        borderStroke: CONFIG.COLORS.TRANSFORMER_BORDER,
        anchorStroke: CONFIG.COLORS.TRANSFORMER_BORDER,
        anchorFill: '#fff',
        anchorSize: 8,
        ignoreStroke: false,
        rotateAnchorOffset: 20,
        enabledAnchors: [
            'top-left', 'top-right', 'bottom-left', 'bottom-right',
            'middle-left', 'middle-right', 'top-center', 'bottom-center'
        ]
    });
    
    layer.add(transformer);
    
    return { stage, layer, transformer };
}

export function applyCanvasStyles(container, bgColor, gridColor, gridSize) {
    if (!container) return;
    container.style.backgroundColor = bgColor;
    container.style.backgroundImage = `
        linear-gradient(to right, ${gridColor} 1px, transparent 1px),
        linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)
    `;
    container.style.backgroundSize = `${gridSize}px ${gridSize}px`;
}

export function updateStageSize(stage, container) {
    if (!stage || !container) return;
    stage.width(container.clientWidth);
    stage.height(container.clientHeight);
}