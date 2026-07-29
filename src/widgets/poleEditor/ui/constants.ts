import { RelativeSidePosition } from "@/shared/types/catenaryTypes";

export const GABARIT_INPUT_STEP = 0.1;
export const X_INPUT_STEP = 1;

export const DIRECTION_LABEL: Record<RelativeSidePosition, string> = {
    [RelativeSidePosition.LEFT]: "Л",
    [RelativeSidePosition.RIGHT]: "П",
};

export const DIRECTION_TITLE: Record<RelativeSidePosition, string> = {
    [RelativeSidePosition.LEFT]: "Слева по ходу движения (нажать для смены)",
    [RelativeSidePosition.RIGHT]: "Справа по ходу движения (нажать для смены)",
};

export const GROUNDING_DESCRIPTION: Record<string, string> = {
    none: "",
    И: "Индивидуальное",
    ИИ: "Двойное индивидуальное",
    ИДЗ: "Инд. диодная защита",
    ГДЗ: "Групповая диодная защита",
    ТГЗ: "Тросовое групповое заземление",
};
