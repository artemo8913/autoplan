# АС План КС — Claude Code Context

## Проект

Web-приложение для генерации планов контактной сети (КС) железных дорог по ГОСТ/Порядку ОАО «РЖД» 2023.
SVG-отрисовка, только просмотр/экспорт, без бэкенда.

## Стек

- React 18 + Vite + TypeScript
- MobX (`makeObservable` / `makeAutoObservable`) — основа реактивности
- SVG (не Canvas)
- FSD (Feature Sliced Design)

## Структура проекта

```
src/
├── app/
│   ├── index.ts                     # barrel: экспортирует App, init, useStore, useServices
│   ├── compositionRoot.ts           # DI: init() → { store, services, inputHandler }
│   ├── initMock.ts                  # createTestData() — тестовые данные (вынести позже)
│   ├── types.ts                     # interface Store (все сторы), interface Services
│   ├── store/
│   │   ├── UIStore.ts               # tool state machine, ViewBox, hover, keyboard; exports ToolState, ViewBox
│   │   ├── UndoStackStore.ts        # class UndoStackStore + BatchCommand (Command pattern, maxSize=100)
│   │   ├── PolesStore.ts            # Map<string, CatenaryPole>
│   │   ├── TracksStore.ts           # Map<string, Track>
│   │   ├── FixingPointsStore.ts     # Map<string, FixingPoint>
│   │   ├── AnchorSectionsStore.ts   # Map<string, AnchorSection>
│   │   ├── JunctionsStore.ts        # Map<string, Junction> + insulatingJunctionAnchorPoleIds (computed)
│   │   ├── VlPolesStore.ts          # Map<string, VlPole>
│   │   ├── WireLinesStore.ts        # Map<string, WireLine>
│   │   └── CrossSpansStore.ts       # Map<string, FlexibleCrossSpan | RigidCrossSpan>
│   ├── services/
│   │   ├── InputHandler.ts          # обработчик мыши/клавиатуры; координирует UIStore + EntityService
│   │   ├── EntityService.ts         # createEntity/createCatenaryPole/createVlPole/deleteEntities с undo; exports SnapInfo via SnapService
│   │   ├── HitTestService.ts        # hitTest(svgPos) → entity; hitTestRect() → лассо
│   │   ├── SnapService.ts           # calcSnap(pos, config) → SnapInfo; exports SnapInfo
│   │   ├── MeasureService.ts        # svgXToKmPkM(), formatKmPkM()
│   │   ├── HitTestService.ts        # hitTest/hitTestRect; exports HitTestResult
│   │   └── SvgDrawer.ts             # calcSVGPath(poses: Pos[]): string
│   └── ui/
│       ├── App.tsx                  # layout: Toolbar + InteractiveCanvas + StatusBar + PoleEditorPanel
│       ├── InteractiveCanvas.tsx    # SVG-обёртка: mount InputHandler, viewBox из UIStore, overlay-слои
│       ├── StoreProvider.tsx        # Context.Provider для Store
│       ├── ServicesProvider.tsx     # Context.Provider для Services
│       ├── storeContext.tsx         # createContext + useStore() hook
│       └── servicesContext.tsx      # createContext + useServices() hook
│
├── entities/
│   └── catenaryPlanGraphic/
│       ├── index.ts                 # barrel: model + ui (Layer-компоненты)
│       ├── model/
│       │   ├── Railway.ts           # startX/endX, getPositionAtX(x): Pos
│       │   ├── Track.ts             # offset от оси, directionMultiplier, getPositionAtX(x)
│       │   ├── CatenaryPole.ts      # makeObservable явный, pos (computed), setters (actions)
│       │   ├── VlPole.ts            # makeAutoObservable, vlType: VlPoleType
│       │   ├── FixingPoint.ts       # pole: IPole, track?, yOffset, zigzagValue?; startPos/endPos — геттеры
│       │   ├── WireLine.ts          # wireType: WireType, fixingPoints[]
│       │   ├── AnchorSection.ts     # startPole/endPole, fixingPoints[], getCatenaryPoses(overlapRange?)
│       │   ├── Junction.ts          # type: JunctionType, anchorPoleIds, overlapXRange
│       │   ├── CrossSpan.ts         # FlexibleCrossSpan / RigidCrossSpan implements ICrossSpan
│       │   └── SupportStructure.ts  # тип опорной конструкции (заглушка)
│       └── ui/                      # ⚠️ FSD-исключение: Layer-компоненты импортируют useStore из @/app
│           ├── PoleLayer.tsx        # опоры КС (onClick → selectEntity)
│           ├── VlPoleLayer.tsx      # опоры ВЛ
│           ├── TrackLayer.tsx       # пути
│           ├── FixingPointsLayer.tsx # консоли опора↔путь
│           ├── CatenaryLayer.tsx    # подвеска по AnchorSection.getCatenaryPoses()
│           ├── ZigzagLayer.tsx      # зигзаги (только внутри Junction.overlapXRange)
│           ├── SpanLengthLayer.tsx  # длины пролётов
│           └── WireLineLayer.tsx    # доп. провода (ДПР, питающий, ВЛ)
│
├── features/
│   ├── plans/
│   │   ├── import/ui/ImportPlanButton.tsx   # импорт плана из JSON (file input state)
│   │   ├── export/ui/ExportPlanButton.tsx   # экспорт плана в JSON (Blob flow)
│   │   └── create/ui/CreatePlanButton.tsx   # создание плана (modal state + валидация)
│   ├── placementPreview/
│   │   ├── index.ts
│   │   └── ui/PlacementPreview.tsx  # призрак объекта при размещении + snap-индикатор
│   └── selectionRect/
│       ├── index.ts
│       └── ui/SelectionRect.tsx     # рамка лассо (multiSelect)
│
├── widgets/
│   ├── toolbar/ui/Toolbar.tsx               # кнопки инструментов (placement, pan, select)
│   ├── poleEditor/ui/PoleEditorPanel.tsx    # правая панель редактирования КС-опоры
│   ├── infrastructurePanel/ui/InfrastructurePanel.tsx  # управление ж.д. путями
│   ├── statusBar/ui/StatusBar.tsx           # строка подсказок (statusHint + координаты)
│   ├── planHeader/ui/PlanHeader.tsx         # заголовок плана + кнопки сохранения/экспорта
│   └── plansList/ui/PlansListPage.tsx       # страница списка планов
│
└── shared/
    ├── constants.ts                 # ZIGZAG_DRAW_SCALE и др.
    ├── types/
    │   ├── catenaryTypes.ts         # Pos, IPole, RailwayDirection, CatenaryType, WireType, VlPoleType...
    │   └── toolTypes.ts             # ToolState, ViewBox, SnapInfo, PlaceableEntityConfig, Command...
    └── ui/
        └── gost-symbols.tsx         # ~40 ГОСТ SVG-компонентов + getWireDashArray/getWireInsertSymbol
```

## Архитектурные решения

- **Кривые не реализуем** — пути всегда прямые (п. 2.12 Порядка). `getPositionAtX(x)` возвращает `{x, y: константа}`.
- **Railway/Track не хранят словари поз** — только `getPositionAtX(x: number): Pos`. Для поддержки будущих кривых нужно менять только этот метод.
- **IPole** — общий интерфейс `{ id, x, name, radius, pos }`. `CatenaryPole` и `VlPole` оба `implements IPole`.
- **FixingPoint** — универсальная точка фиксации провода: `pole: IPole`, `track?` (если нет — wire висит на yOffset от опоры), `zigzagValue?`. `startPos`/`endPos` — геттеры. Компонент обязательно `observer`.
- **WireLine** — линия доп. провода: `wireType: WireType`, `fixingPoints[]`. Отрисовка: dashArray + вставной символ каждые 3 точки.
- **VlPole** — опора ВЛ (не КС): `makeAutoObservable`, `vlType: VlPoleType`.
- **CatenaryPole (КС)** — MobX observable (`makeObservable` явный, не auto). `pos` — `computed`. Мутации только через setters (action).
- **anchorGuy / anchorBrace** — поля самой опоры CatenaryPole (свойство опоры, не связь с другим объектом).
- **CrossSpan** — поперечина: `FlexibleCrossSpan` / `RigidCrossSpan`, оба `implements ICrossSpan { id, poleA, poleB: CatenaryPole }`. Отдельная сущность верхнего уровня (не вложена в опору).
- **Store** — все entity-сторы создаются в `compositionRoot.ts::init()`. Layer-компоненты не принимают пропсы, читают сторы через `useStore()`.
- **ID** — `crypto.randomUUID()`
- **SVG-компоненты** из `gost-symbols.tsx` — использовать как есть, символы могут уточняться по ходу вручную.
- **UIStore** — центральная state machine инструментов: 8 режимов (`idle`, `panTool`, `selection`, `dragPan`, `placement`, `multiSelect`, `wireDrawing`, `crossSpan`). `toolState` — discriminated union. Computed: `cursorStyle`, `statusHint`, `placementLabel`, `selectedIds`.
- **InputHandler** — координирует события мыши/клавиатуры → вызывает методы UIStore и EntityService. Получает их через DI (конструктор). Не использует MobX напрямую.
- **EntityService** — `createEntity(pos, config, snap)` — единая точка входа, диспатчит по `config.kind`. Создание/удаление с undo через `undoStackStore.execute(cmd)`. Константы масштаба: `CATENARY_POLE_SCALE_Y = 10` (SVG-единиц на метр габарита).
- **HitTestService** — hit-test по приоритету: FixingPoints (8px) > CatenaryPoles (12px) > VlPoles (12px) > WireLines (6px). Поддерживает rect-тест для лассо.
- **SnapService** — snap к ближайшему треку (`trackSnapRadius = 200` SVG-единиц) или сетке (`gridStepX = 1`). Возвращает `SnapInfo` с км/пк/м и габаритом.
- **UndoStackStore** — отдельный стор. Command pattern, `maxSize = 100`. `BatchCommand` — там же. Передаётся в EntityService и InputHandler через DI.
- **MobX в CatenaryPole.ts**: `makeObservable(this, { field: observable, ... })` — обязательно явные аннотации (decorators не включены в tsconfig).
- **Hook-правило**: `useStore()` нельзя вызывать внутри callback `memo(observer(...))` — нужна именованная функция-компонент: `function Foo() { const x = useStore(); }; const FooWrapped = memo(observer(Foo));`

## FSD: что в какой слой

| Слой         | Что кладём                                                                                                                                                                                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **shared**   | Типы, константы, утилиты, SVG-примитивы без бизнес-логики. Не знает ни о чём выше.                                                                                                                                                                              |
| **entities** | Доменные модели (`CatenaryPole`, `Track`, `FixingPoint`…) и их Layer-компоненты отображения. Нет зависимостей от features/widgets/app.                                                                                                                          |
| **features** | Атомарные действия пользователя. Критерий: **собственное состояние** (useState/MobX local) **или >5 строк нетривиальной логики**. Примеры: `ImportPlanButton` (file input state), `ExportPlanButton` (Blob flow), `CreatePlanButton` (modal state + валидация). |
| **widgets**  | Секции страницы: `Toolbar`, `PoleEditorPanel`, `InfrastructurePanel`, `PlanHeader`, `PlansListPage`. Компонуют features + entities + вызовы сервисов. Каждый виджет уникален (не переиспользуется).                                                             |
| **pages**    | (зарезервировано) Полные страницы/роуты при появлении роутинга.                                                                                                                                                                                                 |
| **app**      | DI-корень (`compositionRoot`), сторы, сервисы, провайдеры контекста. Знает обо всех слоях.                                                                                                                                                                      |

**Правило импортов:** каждый слой импортирует только из слоёв ниже (`shared < entities < features < widgets < app`).

**НЕ выделять в feature:**

- Однострочный `onClick`: `planService.saveCurrent()` — оставить инлайн в виджете
- CRUD-сеттеры формы конкретной сущности (`PoleEditorPanel`) — остаются в виджете
- Бизнес-логика без UI — в сервис (`app/services/`), не в feature

**FSD-исключение (принято осознанно):** импортируются типы и `useService` и `useStore` из `@/app` — Layer-компоненты тесно связаны с доменными моделями того же слайса.

## Известные ограничения (не баги)

- `CatenaryPole._calculateGlobalPosY()` возвращает позицию только по **первому треку** из `_tracks`. Для текущих данных (каждая опора → один трек) корректно.
- **FSD-исключение**: Компоненты импортируют `useService` и `useStore` из `@/app`. Принято осознанно — см. раздел «FSD: что в какой слой».

## Статус этапов

### Основные этапы (план КС)

| #   | Название                                                       | Статус                                                   |
| --- | -------------------------------------------------------------- | -------------------------------------------------------- |
| 1   | ГОСТ-символы (PoleBase, ConsoleSymbol, AnchorGuy, AnchorBrace) | ✅ Готово                                                |
| 2   | Контактная подвеска (AnchorSection, CatenaryLayer)             | ✅ Готово (AnchorSectionArrow — нет)                     |
| 3   | Доп. провода (ДПР, питающий, ВЛ)                               | 🔄 В процессе (инфраструктура готова, нужны тест-данные) |
| 4   | Типы опор (промежуточная / анкерная / фиксирующая)             | ✅ Готово                                                |
| 5   | Зигзаги, номера опор, длины пролётов                           | ✅ Готово                                                |
| 6   | Сопряжения анкерных участков                                   | ✅ Готово                                                |
| 7   | Средние анкеровки                                              | ⬜ Не начато                                             |
| 8   | MobX Store + правая панель редактирования                      | ✅ Готово                                                |
| 9   | Таблица-сетка и спецификация                                   | ⬜ Не начато                                             |

### Этапы редактора (UI-инструменты)

| #    | Название                                           | Статус       |
| ---- | -------------------------------------------------- | ------------ |
| UI-1 | Типы (ToolState) + новый UIStore (state machine)   | ✅ Готово    |
| UI-2 | InteractiveCanvas + Pan/Zoom (viewBox в UIStore)   | ✅ Готово    |
| UI-3 | Выделение, Hover, Лассо                            | ✅ Готово    |
| UI-4 | Toolbar + PlacementPreview + Snap + Undo           | ✅ Готово    |
| UI-5 | PropertyPanel (универсальная: КС, ВЛ, мультивыбор) | ⬜ Не начато |
| UI-6 | Delete выделенного; Ctrl+Z/Y                       | ✅ Готово    |

**Текущий этап: Этап 3** (доп. провода) + **UI-5** (PropertyPanel)

**Данные зигзага:** `FixingPoint.zigzagValue?: number` (мм, знак = направление: +250 от опоры, -250 к опоре).

**Этап 6 — ключевые решения:**

- Зигзаг влияет на отрисовку пути КС: позиция = `endPos.y + zigzagValue * ZIGZAG_DRAW_SCALE` (`src/shared/constants.ts`)
- Зигзаг в CatenaryLayer/ZigzagLayer применяется ТОЛЬКО внутри `Junction.overlapXRange`.
- В overlap-зоне сопряжения каждая секция имеет **отдельные** объекты `FixingPoint` (иначе невозможно задать разные зигзаги для одного полюса в разных секциях). Переходные опоры имеют 2 консоли — физически корректно.
- Синие опоры ИС: `CatenaryPole.isInsulatingJunctionAnchor: boolean` (MobX observable), задаётся в compositionRoot.
- Изоляторы — отложены до следующих этапов.

**Будущие шаги редактора (не в текущем скоупе):**

- WireDrawing — заглушка в UIStore/InputHandler готова, нужен `EntityService.createWireLine`
- CrossSpan — заглушка готова, нужен `EntityService.createCrossSpan`
- Drag выделенного объекта — `SelectionState.isDragging` + `setEntityPosition`
- Контекстное меню (ПКМ)
- Minimap
- **ToolStateService**: разделить UIStore на `ToolStateStore (данные)` + `ToolStateService (логика переходов)`. Сложность: MobX actions должны жить в store, логика переходов нетривиально завязана на состояние. Большой рефакторинг без чёткого выигрыша для текущего масштаба.
- **Mode-specific services** (PlacementService, SelectionService, PanService): оправданы когда каждый режим имеет >100 строк логики. Сейчас ~50 строк на режим в InputHandler.
- **selectedIds → Set**: текущий масштаб (40 опор) не требует O(1) поиска. Затронет SelectionState, toggle-логику и все компоненты читающие `selectedIds`.

## Ключевые файлы для чтения

При старте новой сессии или задачи:

1. `docs/gost-reference.md` — справочник символов ГОСТ
2. `src/shared/ui/gost-symbols.tsx` — все готовые SVG-компоненты. Могут быть не совсем корректны.
3. `src/entities/catenaryPlanGraphic/model/<нужный класс>` — доменная модель
4. `src/app/compositionRoot.ts` — DI-корень, структура объектов
5. `src/app/store/UIStore.ts` — state machine инструментов (ToolState discriminated union)
6. `src/app/services/InputHandler.ts` — обработчик ввода
7. `src/shared/types/toolTypes.ts` — `EntityType`, `PlaceableEntityConfig`
8. `src/shared/types/catenaryTypes.ts` — доменные типы (Pos, IPole, WireType, CatenaryType...)
9. `./DEFINITIONS.md` — основные понятия инструкции по эксплуатации контактной сети РЖД
