import type { JunctionType } from "@/shared/types/catenaryTypes";

export const JUNCTION_TYPE_DATA: { value: JunctionType; label: string }[] = [
    { value: "non-insulating", label: "Неизол." },
    { value: "insulating", label: "Изол." },
];
