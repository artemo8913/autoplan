# АС План КС — Claude Code Context

## Проект

Web-приложение для генерации планов контактной сети (КС) железных дорог по ГОСТ/Порядку ОАО «РЖД» 2023.
SVG-отрисовка, бэкенда нет.

## Стек

- React 18 + Vite + TypeScript
- MobX (`makeObservable` / `makeAutoObservable`) — реактивность
- SVG (не Canvas), Mantine, FSD

## Структура проекта

```
src/
├── app/
│   ├── compositionRoot.ts           # DI: init() → { store, services, inputHandler }
│   ├── initMock.ts                  # createTestData() — тестовые данные
│   ├── types.ts                     # interface Store, interface Services
│   ├── store/
│   │   ├── UIStore.ts               # ToolState machine, ViewBox, hover, keyboard
│   │   ├── UIPanelsStore.ts         # видимость боковых панелей
│   │   ├── UndoStackStore.ts        # Command pattern, maxSize=100; BatchCommand внутри
│   │   ├── PolesStore.ts            # Map<string, CatenaryPole>
│   │   ├── TracksStore.ts           # Map<string, Track>
│   │   ├── FixingPointsStore.ts     # Map<string, FixingPoint>
│   │   ├── AnchorSectionsStore.ts   # Map<string, AnchorSection>
│   │   ├── JunctionsStore.ts        # Map<string, Junction> + insulatingJunctionAnchorPoleIds
│   │   ├── VlPolesStore.ts          # Map<string, VlPole>
│   │   ├── WireLinesStore.ts        # Map<string, WireLine>
│   │   └── CrossSpansStore.ts       # Map<string, FlexibleCrossSpan | RigidCrossSpan>
│   ├── services/
│   │   ├── InputHandler.ts          # мышь/клавиатура → UIStore + EntityService
│   │   ├── EntityService.ts         # createEntity/deleteEntities с undo
│   │   ├── HitTestService.ts        # hitTest(svgPos) → entity; hitTestRect() → лассо
│   │   ├── SnapService.ts           # calcSnap(pos) → SnapInfo (км/пк/м, габарит)
│   │   ├── MeasureService.ts        # svgXToKmPkM(), formatKmPkM()
│   │   └── SvgDrawer.ts             # calcSVGPath(poses: Pos[]): string
│   └── ui/
│       └── App.tsx                  # layout: Toolbar + Canvas + StatusBar + боковые панели
│
├── entities/
│   └── catenaryPlanGraphic/
│       ├── model/
│       │   ├── Railway.ts, Track.ts
│       │   ├── CatenaryPole.ts      # makeObservable явный; pos (computed)
│       │   ├── VlPole.ts            # makeAutoObservable; vlType: VlPoleType
│       │   ├── FixingPoint.ts       # pole: IPole, track?, yOffset, zigzagValue?
│       │   ├── WireLine.ts          # wireType: WireType, fixingPoints[]
│       │   ├── AnchorSection.ts     # startPole/endPole, fixingPoints[], getCatenaryPoses()
│       │   ├── Junction.ts          # type: JunctionType, anchorPoleIds, overlapXRange
│       │   └── CrossSpan.ts         # FlexibleCrossSpan / RigidCrossSpan implements ICrossSpan
│       └── ui/                      # Layer-компоненты; импортируют useStore из @/app (FSD-исключение)
│           ├── PoleLayer, VlPoleLayer, TrackLayer, FixingPointsLayer
│           ├── CatenaryLayer, ZigzagLayer, SpanLengthLayer, WireLineLayer
│           └── CrossSpanLayer
│
├── features/
│   ├── plans/{import,export,create}  # ImportPlanButton, ExportPlanButton, CreatePlanButton
│   ├── placementPreview/             # PlacementPreview (призрак + snap-индикатор)
│   └── selectionRect/                # SelectionRect (лассо)
│
├── widgets/
│   ├── toolbar/                      # кнопки инструментов
│   ├── poleEditor/                   # панель редактирования КС-опоры
│   ├── tracksEditor/                 # панель управления ж.д. путями
│   ├── junctionsEditor/              # панель управления сопряжениями АУ
│   ├── linesEditor/                  # панель АУ и ВЛ (разбита на CollapsibleSection, AnchorSectionRow и др.)
│   ├── displaySettings/              # модалка настроек отображения
│   ├── statusBar/                    # строка подсказок + координаты
│   ├── planHeader/                   # заголовок + кнопки сохранения/экспорта
│   └── plansList/                    # страница списка планов
│
└── shared/
    ├── constants.ts                  # ZIGZAG_DRAW_SCALE, CATENARY_POLE_SCALE_Y и др.
    ├── types/
    │   ├── catenaryTypes.ts          # Pos, IPole, CatenaryType, WireType, VlPoleType...
    │   └── toolTypes.ts              # ToolState, ViewBox, SnapInfo, EntityType, Command...
    └── ui/
        ├── SidePanel.tsx             # обёртка боковых панелей (title, onClose, width, headerExtra)
        └── gost-symbols.tsx          # ~40 ГОСТ SVG-компонентов
```

## Архитектурные решения

- **Кривые не реализуем** — `getPositionAtX(x)` в Railway/Track. При поддержке кривых менять только этот метод.
- **CrossSpan** — `FlexibleCrossSpan` / `RigidCrossSpan`, `implements ICrossSpan { id, poleA, poleB }`. Отдельная сущность верхнего уровня.
- **anchorGuy / anchorBrace** — свойства `CatenaryPole`, не отдельная сущность.
- **Зигзаг** — `FixingPoint.zigzagValue?: number` (мм). Применяется ТОЛЬКО внутри `Junction.overlapXRange`. Позиция на SVG = `endPos.y + zigzagValue * ZIGZAG_DRAW_SCALE`.
- **ИС (overlap-зона)** — каждая АУ-секция имеет **отдельные** FixingPoint в overlap-зоне (разные зигзаги на одном полюсе). `CatenaryPole.isInsulatingJunctionAnchor: boolean` — синие опоры.
- **HitTestService** — приоритет: FixingPoints КС (8px) > CatenaryPoles (12px) > VlPoles (12px) > WireLines (6px). FixingPoints ВЛ-опор игнорируются при hit-test.
- **EntityService** — `createEntity(pos, config, snap)`. Undo через `undoStackStore.execute(cmd)`. `CATENARY_POLE_SCALE_Y = 10` (SVG-ед/м габарита).
- **SnapService** — snap к треку (`trackSnapRadius = 200`) или сетке (`gridStepX = 1`).
- **MobX в CatenaryPole.ts** — `makeObservable(this, { field: observable })` явные аннотации (decorators отключены).
- **ID** — `crypto.randomUUID()`

## FSD: правила

`shared < entities < features < widgets < app`

**FSD-исключение (принято):** `useStore` / `useServices` из `@/app` импортируются в нижние слои.

**НЕ выделять в feature:** однострочные onClick, CRUD-сеттеры форм, бизнес-логика без UI (→ в сервис).

## Известные ограничения

- `CatenaryPole._calculateGlobalPosY()` — позиция только по первому треку (корректно для текущих данных).
- Тестовые данные в `initMock.ts::createTestData()` — вынести позже.

## Ключевые файлы

1. `DEFINITIONS.md` — понятия инструкции по КС РЖД
2. `gost-reference.md` — справочник ГОСТ-символов
3. `src/shared/ui/gost-symbols.tsx` — готовые SVG-компоненты
4. `src/entities/catenaryPlanGraphic/model/<класс>` — доменная модель
5. `src/app/compositionRoot.ts` — DI-корень
6. `src/app/store/UIStore.ts` — ToolState machine
7. `src/app/services/InputHandler.ts` — обработчик ввода
8. `src/shared/types/catenaryTypes.ts` + `toolTypes.ts` — все типы
