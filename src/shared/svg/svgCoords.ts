import type { Pos } from "@/shared/types/catenaryTypes";

/**
 * Преобразует экранные координаты в SVG-координаты через матрицу CTM.
 */
export function screenToSvg(el: SVGSVGElement, screenX: number, screenY: number): Pos {
    const pt = el.createSVGPoint();
    pt.x = screenX;
    pt.y = screenY;
    const svgP = pt.matrixTransform(el.getScreenCTM()!.inverse());
    return { x: svgP.x, y: svgP.y };
}

/**
 * Ширина SVG-элемента в экранных пикселях.
 */
export function getSvgClientWidth(el: SVGSVGElement): number {
    return el.getBoundingClientRect().width;
}

/**
 * Масштаб для pan: сколько SVG-единиц в одном экранном пикселе.
 * Возвращает null если CTM недоступна.
 */
export function getSvgPanScale(el: SVGSVGElement): { x: number; y: number } | null {
    const ctm = el.getScreenCTM();
    return ctm ? { x: 1 / ctm.a, y: 1 / ctm.d } : null;
}
