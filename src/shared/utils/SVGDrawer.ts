import type { Pos } from "@/shared/types";

export class SVGDrawer {
    calcSVGPath(poses: Pos[]){
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