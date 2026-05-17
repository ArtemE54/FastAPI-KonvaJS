// 📤 Экспорт в SVG
import { escapeHtml } from './utils.js';

export function exportToSVG(layer, transformer, hideTextEditor, isEditingText) {
    if (isEditingText && hideTextEditor) hideTextEditor(true);
    if (transformer) transformer.nodes([]);
    layer.draw();

    try {
        const nodes = layer.getChildren().filter(n => n !== transformer);
        if (nodes.length === 0) { alert('Нет объектов для экспорта!'); return; }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        nodes.forEach(node => {
            const box = node.getClientRect();
            minX = Math.min(minX, box.x);
            minY = Math.min(minY, box.y);
            maxX = Math.max(maxX, box.x + box.width);
            maxY = Math.max(maxY, box.y + box.height);
        });

        const padding = 10;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;
        const width = maxX - minX;
        const height = maxY - minY;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">`;
        svg += `<rect width="100%" height="100%" fill="none"/>`;

        nodes.forEach(node => {
            const type = node.getClassName();
            const a = node.attrs;
            const x = a.x || 0, y = a.y || 0, rot = a.rotation || 0;
            const transform = (x || y || rot) ? ` transform="translate(${x},${y}) rotate(${rot})"` : '';
            const stroke = a.stroke || '#888';
            const sw = a.strokeWidth || 2;
            const fill = a.fill || 'none';

            let el = '';
            if (type === 'Rect') {
                el = `<rect x="0" y="0" width="${a.width||0}" height="${a.height||0}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}"${transform}/>`;
            }
            else if (type === 'Circle') {
                el = `<circle cx="0" cy="0" r="${a.radius||0}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}"${transform}/>`;
            }
            else if (type === 'Text') {
                const safeText = (a.text || 'T').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const fontSize = a.fontSize || 16;
                const fontFamily = a.fontFamily || 'Arial';
                el = `<text x="0" y="0" font-family="${fontFamily}" font-size="${fontSize}" fill="${fill}" text-anchor="start" dominant-baseline="hanging"${transform}>${safeText}</text>`;
            }
            else if (type === 'Line' && (a.points||[]).length >= 4) {
                el = `<polyline points="${a.points.join(' ')}" stroke="${stroke}" stroke-width="${sw}" fill="none" stroke-linecap="round"${transform}/>`;
            }
            else if (type === 'Arc' && (a.outerRadius||0) > 0) {
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
            }

            if (el) svg += el;
        });

        svg += `</svg>`;

        const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ugo_${Date.now()}.svg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        if (window.qtBridge && window.qtBridge.receiveSvg) window.qtBridge.receiveSvg(svg);
    } catch (err) {
        console.error(err);
        alert('Ошибка экспорта: ' + err.message);
    }
}