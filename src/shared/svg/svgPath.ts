import type { Pos } from "@/shared/types/catenaryTypes";

/**
 * Строит SVG path-строку из массива точек (M x,y L x,y ...).
 */
export function calcSvgPath(poses: Pos[]): string {
    let path = "";
    for (let i = 0; i < poses.length; i++) {
        path += i === 0 ? "M" : "L";
        path += `${poses[i].x},${poses[i].y} `;
    }
    return path;
}
