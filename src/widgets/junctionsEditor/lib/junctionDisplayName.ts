import type { Junction } from "@/entities/catenaryPlanGraphic";

export function junctionDisplayName(j: Junction): string {
    if (j.name) {
        return j.name;
    }
    const s1 = j.section1.name || "АУ";
    const s2 = j.section2.name || "АУ";
    return `${s1} ↔ ${s2}`;
}
