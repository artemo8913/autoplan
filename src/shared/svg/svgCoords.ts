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
 * Преобразует SVG-координаты в экранные координаты через матрицу CTM.
 */
export function svgToScreen(el: SVGSVGElement, svgX: number, svgY: number): Pos {
    const pt = el.createSVGPoint();
    pt.x = svgX;
    pt.y = svgY;
    const sp = pt.matrixTransform(el.getScreenCTM()!);
    return { x: sp.x, y: sp.y };
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

export function svgXToKmPkM(
    svgX: number,
    startKm: number = 0,
    metersPerSvgUnit: number = 1,
): { km: number; pk: number; m: number } {
    const totalMeters = svgX * metersPerSvgUnit + startKm * 1000;
    const km = Math.floor(totalMeters / 1000);
    const remaining = totalMeters - km * 1000;
    const pk = Math.floor(remaining / 100);
    const m = Math.round(remaining - pk * 100);
    return { km, pk, m };
}
