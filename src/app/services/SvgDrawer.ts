import type { Pos } from "@/shared/types/catenaryTypes";

/**
 * @deprecated не тянет на звание сервиса. Сервис - это что-то связанное с бизнес-логикой,
 * класс, который каким-то образом работает со структурами данных (с хранилищем)
 * здесь же просто вспомонательная функция
 * TODO: в shared/lib/svg или аналогичный смысл
 */
export class SVGDrawer {
    calcSVGPath(poses: Pos[]) {
        let drawPath = "";

        for (let i = 0; i < poses.length; i++) {
            const pos = poses[i];

            if (i === 0) {
                drawPath += "M";
            } else {
                drawPath += "L";
            }

            drawPath += `${pos.x},${pos.y}`;
            drawPath += " ";
        }

        return drawPath;
    }
}
