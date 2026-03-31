import { Junction } from "@/entities/catenaryPlanGraphic";
import type { AnchorSection } from "@/entities/catenaryPlanGraphic";

/**
 * Авто-определение сопряжений: находит пары АУ, имеющих общие опоры (через FixingPoint).
 * section1 — секция с меньшим startPole.x (для упорядоченности).
 * По умолчанию тип = "non-insulating".
 */
export function detectJunctions(sections: AnchorSection[]): Junction[] {
    const poleToSections = new Map<string, Set<AnchorSection>>();

    for (const section of sections) {
        for (const fp of section.fixingPoints) {
            const poleId = fp.pole.id;
            let set = poleToSections.get(poleId);
            if (!set) {
                set = new Set();
                poleToSections.set(poleId, set);
            }
            set.add(section);
        }
    }

    const pairKey = (a: string, b: string) => (a < b ? `${a}_${b}` : `${b}_${a}`);
    const seen = new Set<string>();
    const junctions: Junction[] = [];

    for (const sectionSet of poleToSections.values()) {
        if (sectionSet.size < 2) continue;
        const arr = [...sectionSet];
        for (let i = 0; i < arr.length; i++) {
            for (let j = i + 1; j < arr.length; j++) {
                const key = pairKey(arr[i].id, arr[j].id);
                if (seen.has(key)) continue;
                seen.add(key);

                const [s1, s2] =
                    (arr[i].startPole?.x ?? 0) <= (arr[j].startPole?.x ?? 0)
                        ? [arr[i], arr[j]]
                        : [arr[j], arr[i]];

                junctions.push(
                    new Junction({ section1: s1, section2: s2, type: "non-insulating" }),
                );
            }
        }
    }

    return junctions;
}
