import { RelativeSidePosition } from "@/shared/types/catenaryTypes";

/** Строка таблицы — мутабельные строки для инпутов */
export interface BulkPoleRow {
    rowKey: string;                    // crypto.randomUUID() — React key
    name: string;
    x: string;                         // строка на время редактирования
    trackId: string;
    gabarit: string;                   // строка на время редактирования
    side: RelativeSidePosition | null;
}

/** Валидированная строка — передаётся в EntityService */
export interface ValidatedPoleRow {
    name: string;
    x: number;
    trackId: string;
    gabarit: number;
    side: RelativeSidePosition;
}

export interface RowValidationError {
    rowIndex: number;
    field: "name" | "x" | "trackId" | "gabarit" | "side";
    message: string;
}
