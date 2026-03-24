import type { WireType } from "@/shared/types/catenaryTypes";

export const WIRE_TYPE_LABELS: Record<WireType, string> = {
    feeding_25: "Питающий 2×25 кВ",
    reinforcing: "Усиливающий",
    screening: "Экранирующий",
    return_air: "Отсасывающая",
    grounding: "Групповое заземление",
    radio_guide: "ПРС (волновод)",
    vl: "ВЛ",
    volp: "ВОЛП",
};
