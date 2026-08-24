import { z } from "zod";

import type { PlanDTO } from "@/shared/types/planTypes";
import { RelativeSidePosition, CatenaryType } from "@/shared/types/catenaryTypes";

/**
 * Схема формата плана: последний рубеж перед `fromDTO`, который доверяет данным
 * (ссылки на опоры и пути разрешаются без проверок). Чужой или битый файл
 * должен ловиться здесь и объясняться пользователю, а не падать в рендере.
 *
 * Схема НЕ строгая: неизвестные поля пропускаются как есть — план,
 * сохранённый более новой версией с тем же `version`, остаётся читаемым.
 */

const id = z.string().min(1);
const finite = z.number().finite();

const sidePosition = z.union([z.literal(RelativeSidePosition.LEFT), z.literal(RelativeSidePosition.RIGHT)]);

const nonStandardKmSchema = z.object({
    km: z.number().int(),
    picketCount: z.number().int().positive(),
    picketOverrides: z.record(z.string(), finite.positive()).optional(),
});

const railwaySchema = z.object({
    name: z.string(),
    startX: finite,
    endX: finite,
    picketage: z.array(nonStandardKmSchema).optional(),
});

const trackSchema = z.object({
    id,
    name: z.string(),
    startX: finite,
    endX: finite,
    yOffsetMeters: finite,
});

const trackBindingSchema = z.object({
    trackId: id,
    gabarit: finite,
    relativePositionToTrack: sidePosition,
});

const catenaryPoleSchema = z.object({
    id,
    x: finite,
    name: z.string(),
    radius: finite.positive(),
    material: z.enum(["metal", "concrete", "composite"]),
    isInsulatingJunctionAnchor: z.boolean(),
    grounding: z.string().optional(),
    anchorGuy: z.object({ type: z.enum(["single", "double"]), direction: sidePosition }).optional(),
    anchorBrace: z.object({ direction: sidePosition }).optional(),
    trackBindings: z.array(trackBindingSchema),
    primaryTrackId: id.optional(),
});

const vlPoleSchema = z.object({
    id,
    x: finite,
    y: finite,
    name: z.string(),
    vlType: z.enum(["intermediate", "angular", "terminal"]),
});

const fixingPointSchema = z.object({
    id,
    poleId: id,
    trackId: id.optional(),
    yOffset: finite,
    zigzagValue: finite.optional(),
    supportType: z.enum(["pole", "crossSpan", "structure"]).optional(),
    crossSpanId: id.optional(),
});

const anchorSectionSchema = z.object({
    id,
    name: z.string().optional(),
    type: z.enum(CatenaryType),
    startPoleId: id.optional(),
    endPoleId: id.optional(),
    fixingPointIds: z.array(id),
    primaryTrackId: id.optional(),
});

const junctionSchema = z.object({
    id,
    name: z.string().optional(),
    type: z.enum(["non-insulating", "insulating"]),
    section1Id: id,
    section2Id: id,
});

const wireLineSchema = z.object({
    id,
    wireType: z.enum([
        "feeding_25",
        "reinforcing",
        "screening",
        "return_air",
        "grounding",
        "radio_guide",
        "vl",
        "volp",
    ]),
    label: z.string().optional(),
    fixingPointIds: z.array(id),
});

const disconnectorSchema = z.object({
    id,
    name: z.string(),
    poleId: id,
    wireLineId: id.optional(),
    controlType: z.enum(["manual", "remote", "telecontrol"]),
    state: z.enum(["on", "off"]),
    phaseCount: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    yOffset: finite,
});

const crossSpanSchema = z.object({
    id,
    type: z.enum(["flexible", "rigid"]),
    poleAId: id,
    poleBId: id,
});

export const planSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    version: z.number().int().nonnegative(),
    railway: railwaySchema,
    tracks: z.array(trackSchema),
    catenaryPoles: z.array(catenaryPoleSchema),
    vlPoles: z.array(vlPoleSchema),
    fixingPoints: z.array(fixingPointSchema),
    anchorSections: z.array(anchorSectionSchema),
    junctions: z.array(junctionSchema),
    wireLines: z.array(wireLineSchema),
    crossSpans: z.array(crossSpanSchema).optional(),
    disconnectors: z.array(disconnectorSchema).optional(),
});

/** Схема и `PlanDTO` обязаны совпадать: расхождение — ошибка компиляции. */
type SchemaOutput = z.infer<typeof planSchema>;
type AssertAssignable<A extends B, B> = A;
export type _SchemaMatchesDto = [AssertAssignable<SchemaOutput, PlanDTO>, AssertAssignable<PlanDTO, SchemaOutput>];

export type PlanValidationResult = { ok: true; dto: PlanDTO } | { ok: false; reason: string };

/** Сколько проблем показываем пользователю: больше — только шум. */
const MAX_REPORTED_ISSUES = 5;

function formatPath(path: PropertyKey[]): string {
    if (path.length === 0) {
        return "корень плана";
    }
    return path.map((part) => (typeof part === "number" ? `[${part}]` : String(part))).join(".");
}

function formatIssues(issues: z.core.$ZodIssue[]): string {
    const shown = issues
        .slice(0, MAX_REPORTED_ISSUES)
        .map((issue) => `${formatPath([...issue.path])}: ${issue.message}`);
    const rest = issues.length - shown.length;

    return rest > 0 ? `${shown.join("; ")} (и ещё ${rest})` : shown.join("; ");
}

/**
 * Ссылочная целостность: `fromDTO` разрешает id без проверок,
 * поэтому висячая ссылка иначе всплывёт падением при отрисовке.
 */
function checkReferences(dto: PlanDTO): string | null {
    const problems: string[] = [];

    const trackIds = new Set(dto.tracks.map((t) => t.id));
    const catenaryPoleIds = new Set(dto.catenaryPoles.map((p) => p.id));
    const anyPoleIds = new Set([...catenaryPoleIds, ...dto.vlPoles.map((p) => p.id)]);
    const fpIds = new Set(dto.fixingPoints.map((fp) => fp.id));
    const sectionIds = new Set(dto.anchorSections.map((s) => s.id));

    const require = (ok: boolean, message: string) => {
        if (!ok && problems.length < MAX_REPORTED_ISSUES) {
            problems.push(message);
        }
    };

    for (const pole of dto.catenaryPoles) {
        for (const binding of pole.trackBindings) {
            require(trackIds.has(binding.trackId), `опора «${pole.name}» ссылается на несуществующий путь`);
        }
        require(
            pole.primaryTrackId === undefined ||
                pole.trackBindings.some((b) => b.trackId === pole.primaryTrackId),
            `опора «${pole.name}»: главный путь не среди её привязок`,
        );
    }
    for (const fp of dto.fixingPoints) {
        require(anyPoleIds.has(fp.poleId), `точка фиксации ${fp.id} ссылается на несуществующую опору`);
        require(fp.trackId === undefined ||
            trackIds.has(fp.trackId), `точка фиксации ${fp.id} ссылается на несуществующий путь`);
    }
    for (const section of dto.anchorSections) {
        for (const fpId of section.fixingPointIds) {
            require(fpIds.has(fpId), `анкерный участок ${section.id} ссылается на несуществующую точку фиксации`);
        }
        require(section.startPoleId === undefined ||
            catenaryPoleIds.has(
                section.startPoleId,
            ), `анкерный участок ${section.id} ссылается на несуществующую начальную опору`);
        require(section.endPoleId === undefined ||
            catenaryPoleIds.has(
                section.endPoleId,
            ), `анкерный участок ${section.id} ссылается на несуществующую конечную опору`);
    }
    for (const junction of dto.junctions) {
        require(sectionIds.has(junction.section1Id) &&
            sectionIds.has(
                junction.section2Id,
            ), `сопряжение ${junction.id} ссылается на несуществующий анкерный участок`);
    }
    for (const wire of dto.wireLines) {
        for (const fpId of wire.fixingPointIds) {
            require(fpIds.has(fpId), `линия ${wire.id} ссылается на несуществующую точку фиксации`);
        }
    }

    return problems.length > 0 ? [...new Set(problems)].join("; ") : null;
}

/**
 * Проверить структуру плана перед загрузкой в сторы.
 * Версия к этому моменту уже приведена к текущей (см. planMigrations).
 */
export function validatePlanDTO(raw: unknown): PlanValidationResult {
    const parsed = planSchema.safeParse(raw);

    if (!parsed.success) {
        return { ok: false, reason: `Файл не соответствует формату плана — ${formatIssues(parsed.error.issues)}` };
    }

    // Схема пропускает неизвестные поля, но safeParse возвращает только описанные:
    // берём исходный объект, чтобы ничего не потерять при пересохранении.
    const dto = { ...(raw as PlanDTO), ...parsed.data } as PlanDTO;

    const referenceProblem = checkReferences(dto);
    if (referenceProblem) {
        return { ok: false, reason: `План повреждён — ${referenceProblem}` };
    }

    return { ok: true, dto };
}
