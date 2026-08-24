import type { PlanDTO, PlanMeta } from "@/shared/types/planTypes";

import type { PlanSerializationService } from "./PlanSerializationService";
import { migratePlanDTO } from "./planMigrations";
import { validatePlanDTO } from "./planSchema";
import type { NotificationService } from "./NotificationService";
import type { PlanEntityStores } from "../types";
import type { AppStore } from "../store/AppStore";
import type { CameraStore } from "../store/CameraStore";
import type { PlansStore } from "../store/PlansStore";
import type { SaveStatusStore } from "../store/SaveStatusStore";
import type { UndoStackStore } from "../store/UndoStackStore";
import { createTestData } from "../initMock";

const PLANS_KEY = "ech3_plans";
const PLAN_DATA_PREFIX = "ech3_plan_";
const CRASH_DUMP_KEY = "ech3_crash_dump";

/** Пауза после последней правки, через которую план уходит в localStorage. */
export const AUTOSAVE_DEBOUNCE_MS = 1000;

/** Аварийный снимок плана, снятый Error Boundary при падении интерфейса. */
export interface CrashDump {
    savedAt: string;
    reason: string;
    planName: string;
    dto: PlanDTO;
}

export class PlanService {
    private _autosaveTimer: ReturnType<typeof setTimeout> | null = null;
    private _disposeAutosave: (() => void) | null = null;

    constructor(
        private readonly _appStore: AppStore,
        private readonly _plansStore: PlansStore,
        private readonly _serializationService: PlanSerializationService,
        private readonly _cameraStore: CameraStore,
        private readonly _entityStores: PlanEntityStores,
        private readonly _undoStackStore: UndoStackStore,
        private readonly _saveStatusStore: SaveStatusStore,
        private readonly _notificationService: NotificationService,
    ) {}

    // ── Автосохранение ────────────────────────────────────────────────────

    /**
     * Подписаться на изменения плана и сохранять их с задержкой.
     * План меняется только командами undo-стека («единый путь записи»),
     * поэтому одной подписки достаточно — отдельные реакции по сторам не нужны.
     */
    startAutosave(): void {
        this._disposeAutosave?.();
        this._disposeAutosave = this._undoStackStore.onChange(() => this._scheduleAutosave());
    }

    stopAutosave(): void {
        this._cancelScheduledSave();
        this._disposeAutosave?.();
        this._disposeAutosave = null;
    }

    /** Записать отложенные правки немедленно (уход со страницы, закрытие плана). */
    flushAutosave(): void {
        if (this._autosaveTimer === null) {
            return;
        }
        this._cancelScheduledSave();
        this.saveCurrent();
    }

    private _scheduleAutosave(): void {
        if (!this._appStore.currentPlanId) {
            return;
        }

        this._saveStatusStore.setPending();
        this._cancelScheduledSave();
        this._autosaveTimer = setTimeout(() => {
            this._autosaveTimer = null;
            this.saveCurrent();
        }, AUTOSAVE_DEBOUNCE_MS);
    }

    private _cancelScheduledSave(): void {
        if (this._autosaveTimer !== null) {
            clearTimeout(this._autosaveTimer);
            this._autosaveTimer = null;
        }
    }

    // ── Хранилище ─────────────────────────────────────────────────────────

    private _savePlanListToStorage(plans: PlanMeta[]): boolean {
        try {
            localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
            return true;
        } catch {
            return false;
        }
    }

    loadPlanListFromStorage(): PlanMeta[] {
        try {
            const raw = localStorage.getItem(PLANS_KEY);
            return raw ? (JSON.parse(raw) as PlanMeta[]) : [];
        } catch {
            return [];
        }
    }

    private _savePlanToStorage(dto: PlanDTO): boolean {
        try {
            localStorage.setItem(PLAN_DATA_PREFIX + dto.id, JSON.stringify(dto));
            return true;
        } catch {
            return false;
        }
    }

    /** Прочитать план из хранилища: версия приводится к текущей, структура проверяется. */
    loadPlanFromStorage(id: string): PlanDTO | null {
        let parsed: unknown;
        try {
            const raw = localStorage.getItem(PLAN_DATA_PREFIX + id);
            if (!raw) {
                return null;
            }
            parsed = JSON.parse(raw);
        } catch {
            this._notificationService.error("План повреждён и не может быть прочитан", { key: "plan-open" });
            return null;
        }

        const result = this._readPlan(parsed);
        if (!result.ok) {
            this._notificationService.error(`План не открыт: ${result.reason}`, { key: "plan-open" });
            return null;
        }
        return result.dto;
    }

    deletePlanFromStorage(id: string): void {
        localStorage.removeItem(PLAN_DATA_PREFIX + id);
    }

    // ── Жизненный цикл плана ──────────────────────────────────────────────

    openPlan(id: string): void {
        const dto = this.loadPlanFromStorage(id);

        if (!dto) {
            return;
        }

        this._activate(dto, id);
    }

    saveAndClosePlan(): void {
        this._cancelScheduledSave();
        this.saveCurrent();
        this._undoStackStore.clear();
        this._saveStatusStore.setIdle();
        this._appStore.clearCurrentPlan();
    }

    createPlan(name: string, startX = 0, endX = 10000): void {
        const now = new Date().toISOString();
        const meta: PlanMeta = { id: crypto.randomUUID(), name, createdAt: now, updatedAt: now };
        const dto: PlanDTO = { ...this._serializationService.createEmptyDTO(name, startX, endX), ...meta };
        this._plansStore.add(meta);
        this._writePlan(dto);
        this._activate(dto, meta.id);
    }

    /** Импорт из внешнего файла: версия и структура неизвестны — принимаем сырое значение. */
    importPlan(raw: unknown): { ok: true } | { ok: false; reason: string } {
        const result = this._readPlan(raw);
        if (!result.ok) {
            this._notificationService.error(`Импорт не выполнен: ${result.reason}`, { key: "plan-import" });
            return result;
        }

        this._importAsNewPlan(result.dto, result.dto.name);
        this._notificationService.success(`План «${result.dto.name}» импортирован`, { key: "plan-import" });
        return { ok: true };
    }

    loadDemoPlan(): void {
        const data = createTestData();
        const now = new Date().toISOString();
        const meta: PlanMeta = {
            id: crypto.randomUUID(),
            name: "Демо: Малиногорка — Козулька",
            createdAt: now,
            updatedAt: now,
        };

        this._entityStores.tracksStore.loadFrom(data.tracks, data.railway);
        this._entityStores.catenaryPoleStore.loadFrom(data.poles);
        this._entityStores.vlPolesStore.loadFrom(data.vlPoles);
        this._entityStores.fixingPointsStore.loadFrom(data.fixingPoints);
        this._entityStores.anchorSectionsStore.loadFrom(data.anchorSections);
        this._entityStores.junctionsStore.loadFrom(data.junctions);
        this._entityStores.wireLinesStore.loadFrom(data.wireLines);
        this._entityStores.crossSpansStore.loadFrom(data.crossSpans);
        this._entityStores.disconnectorsStore.loadFrom([]);

        this._plansStore.add(meta);
        this._writePlan(this._serializationService.toDTO(meta, this._entityStores));

        this._undoStackStore.clear();
        this._cameraStore.fitToRailway(data.railway.startX, data.railway.endX);
        this._appStore.setCurrentPlan(meta.id);
        this._saveStatusStore.setSaved();
    }

    deletePlan(id: string): void {
        this._plansStore.remove(id);
        this.deletePlanFromStorage(id);
        this._savePlanListToStorage(this._plansStore.list);

        if (this._appStore.currentPlanId === id) {
            this._cancelScheduledSave();
            this._undoStackStore.clear();
            this._saveStatusStore.setIdle();
            this._appStore.clearCurrentPlan();
        }
    }

    /** Записать текущий план в хранилище. Возвращает успех записи. */
    saveCurrent(): boolean {
        const id = this._appStore.currentPlanId;

        if (!id) {
            return false;
        }

        const meta = this._plansStore.get(id);

        if (!meta) {
            return false;
        }

        const updatedMeta: PlanMeta = { ...meta, updatedAt: new Date().toISOString() };
        const dto = this._serializationService.toDTO(updatedMeta, this._entityStores);

        if (!this._savePlanToStorage(dto)) {
            this._reportSaveFailure();
            return false;
        }

        this._plansStore.setJustUpdated(id);
        this._savePlanListToStorage(this._plansStore.list);
        this._saveStatusStore.setSaved();
        return true;
    }

    /** Актуальный JSON текущего плана для выгрузки в файл. */
    exportCurrentPlanJson(): { name: string; json: string } | null {
        const id = this._appStore.currentPlanId;
        const meta = id ? this._plansStore.get(id) : undefined;

        if (!meta) {
            this._notificationService.warning("Сначала откройте план", { key: "plan-export" });
            return null;
        }

        this.flushAutosave();
        return { name: meta.name, json: JSON.stringify(this._serializationService.toDTO(meta, this._entityStores)) };
    }

    // ── Аварийный дамп ────────────────────────────────────────────────────

    /**
     * Снять снимок текущего плана при падении интерфейса.
     * Пишется отдельным ключом: слот самого плана не трогаем — вдруг упали
     * как раз из-за того, что сейчас в сторах.
     */
    saveCrashDump(reason: string): boolean {
        const id = this._appStore.currentPlanId;
        const meta = id ? this._plansStore.get(id) : undefined;

        if (!meta) {
            return false;
        }

        try {
            const dump: CrashDump = {
                savedAt: new Date().toISOString(),
                reason,
                planName: meta.name,
                dto: this._serializationService.toDTO(meta, this._entityStores),
            };
            localStorage.setItem(CRASH_DUMP_KEY, JSON.stringify(dump));
            return true;
        } catch {
            return false;
        }
    }

    readCrashDump(): CrashDump | null {
        try {
            const raw = localStorage.getItem(CRASH_DUMP_KEY);
            return raw ? (JSON.parse(raw) as CrashDump) : null;
        } catch {
            return null;
        }
    }

    discardCrashDump(): void {
        localStorage.removeItem(CRASH_DUMP_KEY);
    }

    /** Восстановить аварийный снимок отдельным планом (исходный не трогаем). */
    restoreCrashDump(): boolean {
        const dump = this.readCrashDump();

        if (!dump) {
            return false;
        }

        const result = this._readPlan(dump.dto);
        if (!result.ok) {
            this._notificationService.error(`Аварийная копия повреждена: ${result.reason}`, { key: "crash-dump" });
            return false;
        }

        const name = `${dump.planName} (восстановлено)`;
        this._importAsNewPlan(result.dto, name);
        this.discardCrashDump();
        this._notificationService.success(`Восстановлен план «${name}»`, { key: "crash-dump" });
        return true;
    }

    // ── Private ───────────────────────────────────────────────────────────

    /** Миграция версии + проверка структуры: общий вход для файла и хранилища. */
    private _readPlan(raw: unknown): { ok: true; dto: PlanDTO } | { ok: false; reason: string } {
        const migration = migratePlanDTO(raw);
        if (!migration.ok) {
            return migration;
        }
        return validatePlanDTO(migration.dto);
    }

    /** Положить готовый DTO новым планом в список и открыть его. */
    private _importAsNewPlan(dto: PlanDTO, name: string): void {
        const now = new Date().toISOString();
        const meta: PlanMeta = { id: crypto.randomUUID(), name, createdAt: now, updatedAt: now };
        const newDto: PlanDTO = { ...dto, ...meta };

        this._plansStore.add(meta);
        this._writePlan(newDto);
        this._activate(newDto, meta.id);
    }

    /** Загрузить план в сторы, навести камеру и начать новую историю правок. */
    private _activate(dto: PlanDTO, id: string): void {
        this._cancelScheduledSave();
        this._serializationService.fromDTO(dto, this._entityStores);
        // История предыдущего плана ссылается на его объекты — откатывать её поверх нового нельзя.
        this._undoStackStore.clear();
        this._cameraStore.fitToRailway(
            this._entityStores.tracksStore.railway.startX,
            this._entityStores.tracksStore.railway.endX,
        );
        this._appStore.setCurrentPlan(id);
        this._saveStatusStore.setSaved();
    }

    private _writePlan(dto: PlanDTO): void {
        if (!this._savePlanToStorage(dto) || !this._savePlanListToStorage(this._plansStore.list)) {
            this._reportSaveFailure();
        }
    }

    private _reportSaveFailure(): void {
        const message = "Не удалось сохранить план: хранилище браузера переполнено или недоступно";
        this._saveStatusStore.setError(message);
        this._notificationService.error(message, { key: "plan-save" });
    }
}
