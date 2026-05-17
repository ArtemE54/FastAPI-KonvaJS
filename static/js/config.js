// 🔧 Конфигурация проекта
export const CONFIG = {
    GRID: {
        DEFAULT_SIZE: 20,
        MIN_SIZE: 5,
        MAX_SIZE: 50,
        STEP: 5
    },
    HISTORY: {
        MAX_STATES: 100
    },
    ARC: {
        DEFAULT_RADIUS: 40,
        DEFAULT_ANGLE: 90,
        MIN_RADIUS: 5,
        MAX_RADIUS: 300,
        MIN_ANGLE: 1,
        MAX_ANGLE: 360
    },
    TEXT: {
        DEFAULT_FONT: 'Arial',
        DEFAULT_SIZE: 16,
        MIN_SIZE: 8,
        MAX_SIZE: 72
    },
    COLORS: {
        DEFAULT_STROKE: '#888888',
        DEFAULT_FILL: '#3a3a3a',
        TRANSFORMER_BORDER: '#007acc',
        BACKGROUND: '#1e1e1e',
        GRID: '#444444'
    },
    STROKE: {
        DEFAULT_WIDTH: 2,
        PORT_WIDTH: 1
    },
    PORT: {
        RADIUS: 6
    }
};

export const TOOLS = {
    POINTER: 'pointer',
    RECT: 'rect',
    SQUARE: 'square',
    CIRCLE: 'circle',
    ARC: 'arc',
    LINE: 'line',
    PORT: 'port',
    TEXT: 'text'
};