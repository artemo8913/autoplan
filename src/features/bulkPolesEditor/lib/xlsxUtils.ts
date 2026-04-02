import * as XLSX from "xlsx";

import { RelativeSidePosition } from "@/shared/types/catenaryTypes";
import type { Track } from "@/entities/catenaryPlanGraphic";

import type { BulkPoleRow, ValidatedPoleRow, RowValidationError } from "./types";

/** Скачать шаблон XLSX с листами "Опоры" и "Пути" */
export function downloadBulkPolesTemplate(tracks: Track[]): void {
    const wb = XLSX.utils.book_new();

    const polesData = [["Название", "X (м)", "ID пути", "Габарит (м)", "Сторона (Л/П)"]];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(polesData), "Опоры");

    const tracksData: unknown[][] = [
        ["ID", "Название"],
        ...tracks.map((t) => [t.id, t.name]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tracksData), "Пути");

    XLSX.writeFile(wb, "bulk_poles_template.xlsx");
}

export type XlsxImportResult =
    | { ok: true; rows: BulkPoleRow[] }
    | { ok: false; message: string };

/**
 * Парсит лист "Опоры" из ArrayBuffer.
 * При любой ошибке возвращает { ok: false, message }.
 */
export function parseXlsxFile(buffer: ArrayBuffer, knownTrackIds: Set<string>): XlsxImportResult {
    let wb: XLSX.WorkBook;
    try {
        wb = XLSX.read(buffer, { type: "array" });
    } catch {
        return { ok: false, message: "Не удалось прочитать файл XLSX." };
    }

    // Ищем лист по имени без учёта регистра и лишних пробелов; иначе берём первый лист
    const sheetName =
        wb.SheetNames.find((n) => n.trim().toLowerCase() === "опоры") ??
        wb.SheetNames[0];

    if (!sheetName) {
        return { ok: false, message: "Файл не содержит ни одного листа." };
    }

    const sheet = wb.Sheets[sheetName];

    // Пересчитываем !ref из реальных ячеек — некоторые редакторы сохраняют
    // только диапазон заголовка, хотя данные в файле присутствуют.
    const cellKeys = Object.keys(sheet).filter((k) => !k.startsWith("!"));
    if (cellKeys.length > 0) {
        const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
        for (const key of cellKeys) {
            const addr = XLSX.utils.decode_cell(key);
            if (addr.r < range.s.r) range.s.r = addr.r;
            if (addr.c < range.s.c) range.s.c = addr.c;
            if (addr.r > range.e.r) range.e.r = addr.r;
            if (addr.c > range.e.c) range.e.c = addr.c;
        }
        sheet["!ref"] = XLSX.utils.encode_range(range);
    }

    type RawRow = Record<string, unknown>;
    const dataRows = XLSX.utils.sheet_to_json<RawRow>(sheet, { raw: false, defval: "" });

    if (dataRows.length === 0) {
        return { ok: false, message: `Лист "${sheetName}" не содержит данных (доступные листы: ${wb.SheetNames.join(", ")}).` };
    }

    // Находим ключи колонок нечувствительно к регистру и пробелам
    const sampleKeys = Object.keys(dataRows[0]);
    const findKey = (candidates: string[]) =>
        sampleKeys.find((k) =>
            candidates.some((c) => k.trim().toLowerCase() === c.toLowerCase()),
        ) ?? null;

    const keyName    = findKey(["Название", "name"]);
    const keyX       = findKey(["X (м)", "X (m)", "X", "x"]);
    const keyTrackId = findKey(["ID пути", "trackId", "track_id", "ID"]);
    const keyGabarit = findKey(["Габарит (м)", "Габарит", "gabarit"]);
    const keySide    = findKey(["Сторона (Л/П)", "Сторона", "side"]);

    if (!keyName || !keyX || !keyTrackId || !keyGabarit || !keySide) {
        const missing = [
            !keyName    && '"Название"',
            !keyX       && '"X (м)"',
            !keyTrackId && '"ID пути"',
            !keyGabarit && '"Габарит (м)"',
            !keySide    && '"Сторона (Л/П)"',
        ].filter(Boolean).join(", ");
        return { ok: false, message: `Не найдены столбцы: ${missing}. Доступные столбцы: ${sampleKeys.join(", ")}.` };
    }

    const rows: BulkPoleRow[] = [];

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 2;

        const name       = String(row[keyName]    ?? "").trim();
        const xRaw       = String(row[keyX]       ?? "").trim().replace(",", ".");
        const trackId    = String(row[keyTrackId] ?? "").trim();
        const gabaritRaw = String(row[keyGabarit] ?? "").trim().replace(",", ".");
        const sideRaw    = String(row[keySide]    ?? "").trim().toUpperCase();

        if (!name) {
            return { ok: false, message: `Строка ${rowNum}: пустое поле "Название".` };
        }
        if (xRaw === "" || isNaN(Number(xRaw))) {
            return { ok: false, message: `Строка ${rowNum}: некорректное значение X "${xRaw}".` };
        }
        if (!knownTrackIds.has(trackId)) {
            return { ok: false, message: `Строка ${rowNum}: неизвестный ID пути "${trackId}". Доступные ID путей можно посмотреть на листе "Пути" шаблона.` };
        }
        const gabaritNum = Number(gabaritRaw);
        if (gabaritRaw === "" || isNaN(gabaritNum) || gabaritNum < 0) {
            return { ok: false, message: `Строка ${rowNum}: некорректный габарит "${gabaritRaw}".` };
        }
        if (sideRaw !== "Л" && sideRaw !== "П") {
            return { ok: false, message: `Строка ${rowNum}: поле "Сторона" должно быть "Л" или "П", получено "${sideRaw}".` };
        }

        rows.push({
            rowKey: crypto.randomUUID(),
            name,
            x: xRaw,
            trackId,
            gabarit: gabaritRaw,
            side: sideRaw === "Л" ? RelativeSidePosition.LEFT : RelativeSidePosition.RIGHT,
        });
    }

    return { ok: true, rows };
}

/** Валидировать строки таблицы, вернуть валидные строки и список ошибок */
export function validateRows(
    rows: BulkPoleRow[],
    knownTrackIds: Set<string>,
): { valid: ValidatedPoleRow[]; errors: RowValidationError[] } {
    const valid: ValidatedPoleRow[] = [];
    const errors: RowValidationError[] = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        let rowOk = true;

        if (!row.name.trim()) {
            errors.push({ rowIndex: i, field: "name", message: "Обязательное поле" });
            rowOk = false;
        }
        const xNum = Number(row.x.replace(",", "."));
        if (row.x.trim() === "" || isNaN(xNum)) {
            errors.push({ rowIndex: i, field: "x", message: "Введите число" });
            rowOk = false;
        }
        if (!row.trackId || !knownTrackIds.has(row.trackId)) {
            errors.push({ rowIndex: i, field: "trackId", message: "Выберите путь" });
            rowOk = false;
        }
        const gNum = Number(row.gabarit.replace(",", "."));
        if (row.gabarit.trim() === "" || isNaN(gNum) || gNum < 0) {
            errors.push({ rowIndex: i, field: "gabarit", message: "Введите число ≥ 0" });
            rowOk = false;
        }
        if (row.side === null) {
            errors.push({ rowIndex: i, field: "side", message: "Выберите сторону" });
            rowOk = false;
        }

        if (rowOk) {
            valid.push({
                name: row.name.trim(),
                x: xNum,
                trackId: row.trackId,
                gabarit: gNum,
                side: row.side!,
            });
        }
    }

    return { valid, errors };
}
