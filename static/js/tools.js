// 🛠 Инструменты рисования
import { CONFIG, TOOLS } from './config.js';
import { snap } from './utils.js';

export let currentTool = TOOLS.POINTER;

export function setCurrentTool(tool) {
    currentTool = tool;
}

export function getCurrentTool() {
    return currentTool;
}

export function createShape(tool, x, y, gridSize, arcRadius, arcAngle) {
    const base = {
        x: x,
        y: y,
        name: 'ugo-element',
        stroke: CONFIG.COLORS.DEFAULT_STROKE,
        strokeWidth: CONFIG.STROKE.DEFAULT_WIDTH,
        listening: true
    };

    switch (tool) {
        case TOOLS.RECT:
        case TOOLS.SQUARE:
            return new Konva.Rect({
                ...base,
                width: gridSize,
                height: gridSize,
                fill: CONFIG.COLORS.DEFAULT_FILL
            });

        case TOOLS.CIRCLE:
            return new Konva.Circle({
                ...base,
                radius: gridSize / 2,
                fill: CONFIG.COLORS.DEFAULT_FILL
            });

        case TOOLS.ARC:
            return new Konva.Arc({
                ...base,
                innerRadius: 0,
                outerRadius: arcRadius || CONFIG.ARC.DEFAULT_RADIUS,
                angle: arcAngle || CONFIG.ARC.DEFAULT_ANGLE,
                fill: 'transparent',
                stroke: CONFIG.COLORS.DEFAULT_STROKE,
                strokeWidth: CONFIG.STROKE.DEFAULT_WIDTH
            });

        case TOOLS.LINE:
            return new Konva.Line({
                ...base,
                points: [0, 0, gridSize, gridSize],
                lineCap: 'round',
                fill: 'none'
            });

        case TOOLS.PORT:
            return new Konva.Circle({
                ...base,
                radius: CONFIG.PORT.RADIUS,
                fill: CONFIG.COLORS.DEFAULT_STROKE,
                name: 'port',
                strokeWidth: CONFIG.STROKE.PORT_WIDTH
            });

        default:
            return null;
    }
}

export function updateShape(tool, shape, startX, startY, pos, gridSize) {
    if (!shape) return;

    const dx = snap(pos.x, gridSize) - startX;
    const dy = snap(pos.y, gridSize) - startY;

    switch (tool) {
        case TOOLS.LINE:
            shape.points([0, 0, dx, dy]);
            break;

        case TOOLS.CIRCLE:
        case TOOLS.PORT:
            shape.radius(Math.max(gridSize / 2, Math.sqrt(dx * dx + dy * dy)));
            break;

        case TOOLS.ARC:
            shape.outerRadius(Math.max(gridSize, Math.sqrt(dx * dx + dy * dy)));
            break;

        case TOOLS.RECT:
        case TOOLS.SQUARE:
            const w = Math.max(gridSize, Math.abs(dx));
            const h = tool === TOOLS.SQUARE ? w : Math.max(gridSize, Math.abs(dy));
            shape.width(w);
            shape.height(h);
            shape.x(dx >= 0 ? startX : startX - w);
            shape.y(dy >= 0 ? startY : startY - h);
            break;
    }
}