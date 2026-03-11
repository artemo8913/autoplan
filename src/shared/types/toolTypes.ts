// ============================================================================
// Tool State Machine — типы
// ============================================================================
//
// Дискриминированное объединение (discriminated union) по полю `tool`.
// Каждое состояние хранит ТОЛЬКО релевантные данные.
// TypeScript сужает тип через switch/if по `state.tool`.
//
// Приоритет 1: Idle, Selection, DragPan, Placement, MultiSelect
// Приоритет 2: WireDrawing, CrossSpan
// Приоритет 3: Ruler и прочее
// ============================================================================

import type { Pos, WireType } from "@/shared/types/catenaryTypes";

// ── Перечисление всех типов сущностей ───────────────────────────────────────

export type EntityType =
  | "catenaryPole"
  | "vlPole"
  | "supportStructure"
  | "fixingPoint"
  | "wireLine"
  | "anchorSection"
  | "crossSpan"
  | "building"
  | "signal"
  | "platform"
  | "crossing"
  | "insulator";

// ── Размещаемые объекты (для PlacementState) ────────────────────────────────

export type PlaceableEntityConfig =
  | { kind: "catenaryPole"; consoleType: "none" | "single" | "double"; material?: "concrete" | "metal" }
  | { kind: "vlPole"; vlType: "intermediate" | "angular" | "terminal" }
  | { kind: "building" }
  | { kind: "signal" }
  | { kind: "platform" }
  | { kind: "crossing" }
  | { kind: "spotlight" };

// ── Snap (привязка к ближайшим объектам) ────────────────────────────────────

export interface SnapInfo {
  /** К чему произошла привязка */
  snappedTo: "track" | "pole" | "fixingPoint" | "grid" | "none";

  /** ID трека, к которому snap произошёл (для опор КС) */
  trackId?: string;

  /** Координата привязки (км пк м) */
  km?: number;
  pk?: number;
  m?: number;

  /** Габарит до ближайшего пути (м) — для опор КС */
  gauge?: number;

  /** Глобальная Y-координата (для опор ВЛ, у которых нет габарита) */
  globalY?: number;

  /** Расстояние привязки в SVG-единицах (чем меньше, тем «сильнее» snap) */
  magnetDistance: number;

  /** Итоговая позиция после snap */
  snappedPos: Pos;
}

// ── Результат hit-test ──────────────────────────────────────────────────────

export interface HitTestResult {
  /** Найденная сущность (или null — клик в пустоту) */
  entity: { id: string; type: EntityType } | null;

  /** Если попали в точку фиксации */
  fixingPoint: { id: string; poleId: string; pos: Pos } | null;

  /** Позиция клика в SVG-координатах */
  svgPos: Pos;

  /** Позиция клика в screen-координатах */
  screenPos: Pos;
}

// ── ViewBox ─────────────────────────────────────────────────────────────────

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// Состояния инструментов
// ============================================================================

/**
 * PanTool — режим перемещения холста (по умолчанию).
 * LMB drag = pan. ESC из любого состояния возвращает сюда.
 * Курсор: grab.
 */
export interface PanToolState {
  tool: "panTool";
}

/**
 * Idle — инструмент выделения активен, ничего не выбрано.
 * Курсор: default.
 */
export interface IdleState {
  tool: "idle";
}

/**
 * Selection — один или несколько объектов выделены.
 * Курсор: default (или grabbing при перетаскивании).
 */
export interface SelectionState {
  tool: "selection";

  /** ID выделенных объектов */
  selectedIds: string[];

  /** Тип выделенных объектов (при смешанном выделении — 'mixed') */
  selectedType: EntityType | "mixed";

  /** Идёт перетаскивание выделенных объектов? */
  isDragging: boolean;

  /** Начальная позиция drag (SVG-координаты) */
  dragStartPos?: Pos;

  /** Начальные позиции объектов до drag (для delta) */
  dragOriginalPositions?: Map<string, Pos>;
}

/**
 * DragPan — перетаскивание холста.
 * Может быть вызван из ЛЮБОГО состояния (Space/MMB).
 * При завершении — возвращаемся в previousState.
 * Курсор: grabbing.
 */
export interface DragPanState {
  tool: "dragPan";

  /** Состояние, в которое вернёмся после окончания pan */
  previousState: Exclude<ToolState, DragPanState>;

  /** Начальная позиция мыши (screen px) */
  startScreenPos: Pos;

  /** ViewBox на момент начала pan */
  startViewBox: ViewBox;
}

/**
 * Placement — размещение точечного объекта (опора, здание, светофор...).
 * Курсор: crosshair.
 */
export interface PlacementState {
  tool: "placement";

  /** Что именно размещаем */
  entityConfig: PlaceableEntityConfig;

  /** Текущая позиция «призрака» (null пока мышь не двигалась) */
  previewPos: Pos | null;

  /** Информация о привязке */
  snapInfo: SnapInfo | null;

  /** Ctrl зажат — серийное размещение (после клика остаёмся в Placement) */
  isRepeating: boolean;
}

/**
 * MultiSelect — рамка выделения (лассо).
 * Возникает при mousedown в пустоте.
 * Курсор: crosshair.
 */
export interface MultiSelectState {
  tool: "multiSelect";

  /** Начальная точка рамки (SVG) */
  startPos: Pos;

  /** Текущая точка рамки (SVG) */
  currentPos: Pos;

  /** ID объектов, попавших в рамку (обновляется на каждый mousemove) */
  candidateIds: string[];

  /** Типы объектов, попавших в рамку */
  candidateType: EntityType | "mixed" | null;
}

// ── Приоритет 2 (заглушки — реализация позже) ──────────────────────────────

export interface WireDrawingState {
  tool: "wireDrawing";
  wireType: WireType;
  placedPoints: Array<{ poleId: string; structureId?: string; position: Pos }>;
  previewPoint: { poleId: string; position: Pos } | null;
}

export interface CrossSpanState {
  tool: "crossSpan";
  spanType: "flexible" | "rigid";
  poleAId: string | null;
  previewPoleBId: string | null;
}

// ── Объединение ─────────────────────────────────────────────────────────────

export type ToolState =
  | PanToolState
  | IdleState
  | SelectionState
  | DragPanState
  | PlacementState
  | MultiSelectState
  | WireDrawingState
  | CrossSpanState;

// ── Команды (для Undo/Redo) ─────────────────────────────────────────────────

export interface Command {
  /** Описание для пользователя ("Добавлена опора КС №15") */
  description: string;

  /** Выполнить / повторить */
  execute(): void;

  /** Отменить */
  undo(): void;
}

//TODO: классам точно не место в типах данных! Убрать отсюда в сервисы!
/**
 * Группа команд, откатываемая целиком.
 * Используется для массовых операций.
 */
export class BatchCommand implements Command {
    constructor(
    public description: string,
    private commands: Command[],
    ) {}

    execute() {
        this.commands.forEach((cmd) => cmd.execute());
    }

    undo() {
    // Откат в обратном порядке
        for (let i = this.commands.length - 1; i >= 0; i--) {
            this.commands[i].undo();
        }
    }
}
