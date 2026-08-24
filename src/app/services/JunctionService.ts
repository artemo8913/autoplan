import type { JunctionType } from "@/shared/types/catenaryTypes";
import type { Junction } from "@/entities/catenaryPlanGraphic";
import { Junction as JunctionClass, detectJunctions } from "@/entities/catenaryPlanGraphic";

import type { PlanEntityStores } from "../types";
import type { ReversibleOp, UndoStackStore } from "../store/UndoStackStore";
import { BatchCommand } from "../store/UndoStackStore";
import { planDeletion } from "./cascadeRules";

/** Единственный вход для правок сопряжений: каждый метод = команда в undo-стеке. */
export class JunctionService {
    constructor(
        private readonly stores: PlanEntityStores,
        private readonly undoStackStore: UndoStackStore,
    ) {}

    createJunction(section1Id: string, section2Id: string, type: JunctionType): Junction | null {
        const { anchorSectionsStore, junctionsStore } = this.stores;
        const section1 = anchorSectionsStore.anchorSections.get(section1Id);
        const section2 = anchorSectionsStore.anchorSections.get(section2Id);

        if (!section1 || !section2 || section1 === section2) {
            return null;
        }

        // section1 — секция с меньшим startPole.x (для упорядоченности)
        const [s1, s2] =
            (section1.startPole?.x ?? 0) <= (section2.startPole?.x ?? 0) ? [section1, section2] : [section2, section1];

        const junction = new JunctionClass({ section1: s1, section2: s2, type });

        this.undoStackStore.execute({
            description: "Добавлено сопряжение",
            execute: () => junctionsStore.add(junction),
            undo: () => junctionsStore.remove(junction.id),
        });

        return junction;
    }

    deleteJunction(junction: Junction): void {
        const { ops } = planDeletion([junction.id], this.stores);
        this.undoStackStore.execute(new BatchCommand("Удалено сопряжение", ops));
    }

    setJunctionName(junction: Junction, name: string): void {
        const prev = junction.name;
        this.undoStackStore.execute(
            {
                description: `Наименование сопряжения: «${prev}» → «${name}»`,
                execute: () => junction.setName(name),
                undo: () => junction.setName(prev),
            },
            `junction.name:${junction.id}`,
        );
    }

    setJunctionType(junction: Junction, type: JunctionType): void {
        const prev = junction.type;
        this.undoStackStore.execute({
            description: "Изменён тип сопряжения",
            execute: () => junction.setType(type),
            undo: () => junction.setType(prev),
        });
    }

    /**
     * Пересобрать сопряжения автоматически: все существующие заменяются найденными
     * по общим опорам АУ. Замена — одна команда undo-стека.
     */
    runAutoDetectJunctions(): number {
        const { junctionsStore, anchorSectionsStore } = this.stores;
        const previous = junctionsStore.list;
        const detected = detectJunctions(anchorSectionsStore.list);

        const ops: ReversibleOp[] = [
            {
                execute: () => {
                    junctionsStore.clear();
                    detected.forEach((j) => junctionsStore.add(j));
                },
                undo: () => {
                    junctionsStore.clear();
                    previous.forEach((j) => junctionsStore.add(j));
                },
            },
        ];

        this.undoStackStore.execute(new BatchCommand(`Определены сопряжения: ${detected.length}`, ops));

        return detected.length;
    }
}
