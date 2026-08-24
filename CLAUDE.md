# АС План КС — Claude Code Context

## Проект

Web-приложение для генерации планов контактной сети (КС) железных дорог по ГОСТ/Порядку ОАО «РЖД» 2023.
SVG-отрисовка, бэкенда нет — персистентность в localStorage (PlanDTO).

## Стек

- React 19 + Vite 7 + TypeScript (strict)
- MobX 6 (`makeObservable` / `makeAutoObservable`) — реактивность; decorators отключены
- SVG (не Canvas), Mantine 8, FSD
- Тесты: vitest (`npm test`), co-located `*.test.ts`, покрытие считаем только по логике; e2e-каркас Playwright (`npm run test:e2e`, тесты в `e2e/`)

## Структура проекта

```
src/
├── app/
│   ├── compositionRoot.ts           # DI: init() → { store, services }
│   ├── initMock.ts                  # createTestData() — демо-план
│   ├── types.ts                     # interface Store, Services, PlanEntityStores
│   ├── store/
│   │   ├── ToolStateStore.ts        # машина состояний инструмента (discriminated union:
│   │   │                            #   idle | panTool | dragPan | placement | multiSelect | crossSpan | dragEntities)
│   │   ├── SelectionStore.ts        # выделение; per-key isSelected(id) для точечных ре-рендеров
│   │   ├── CameraStore.ts           # viewBox, zoom/pan, fitToRailway
│   │   ├── AppStore.ts              # currentView: planslist|canvas, currentPlanId
│   │   ├── PlansStore.ts            # список PlanMeta
│   │   ├── UndoStackStore.ts        # Command pattern, maxSize=100; BatchCommand + склейка по mergeKey
│   │   ├── UIPanelsStore.ts         # видимость боковых панелей/модалок
│   │   ├── InlineEditStore.ts       # состояние inline-редактирования на канве
│   │   ├── DisplaySettingsStore.ts  # настройки отображения (localStorage, autorun-сохранение)
│   │   ├── SaveStatusStore.ts       # состояние автосохранения: idle|pending|saved|error
│   │   ├── ConfirmDialogStore.ts    # единое подтверждение действий: ask() → Promise<boolean>
│   │   └── <Entity>Store.ts ×9      # однотипные Map-обёртки (add/remove/loadFrom/list):
│   │                                #   CatenaryPoleStore, TracksStore (+ railway), FixingPointsStore,
│   │                                #   AnchorSectionsStore, JunctionsStore (+ insulatingJunctionAnchorPoleIds),
│   │                                #   VlPolesStore, WireLinesStore, CrossSpansStore, DisconnectorsStore
│   ├── services/
│   │   ├── InputHandler.ts          # мышь/клавиатура → диспетчеризация по toolState.tool
│   │   ├── PlacementToolService.ts  # инструмент размещения: превью + создание
│   │   ├── CrossSpanToolService.ts  # инструмент поперечин: выбор пары опор
│   │   ├── SelectionToolService.ts  # жест клик / лассо / drag-intent
│   │   ├── DragService.ts           # перетаскивание выделенного (+ axis lock по Shift)
│   │   ├── EntityService.ts         # создание сущностей на канве + удаление (каскад — cascadeRules)
│   │   ├── cascadeRules.ts          # реестр «удалили X → что с Y»: planDeletion(ids) → обратимые операции
│   │   ├── EditService.ts           # свойства опор: одиночные и bulk (через undo)
│   │   ├── LinesService.ts          # АУ, линии ВЛ, точки фиксации: CRUD и свойства (через undo)
│   │   ├── JunctionService.ts       # сопряжения: CRUD, свойства, авто-детект (через undo)
│   │   ├── TrackService.ts          # пути и участок: CRUD, свойства, пикетаж (через undo)
│   │   ├── InlineEditService.ts     # dblclick-редактирование лейблов: имя опоры, зигзаг, длина пролёта
│   │   ├── HitTestService.ts        # hitTest → сущность; hitTestRect (лассо); hitTestEditTarget (лейблы)
│   │   ├── SnapService.ts           # calcSnap: ближайшие пути сверху/снизу от курсора + сетка (шаг 1 м)
│   │   ├── CameraService.ts         # pan/zoom поверх CameraStore + ToolStateStore
│   │   ├── PlanSerializationService.ts  # toDTO/fromDTO; порядок восстановления:
│   │   │                            #   пути → опоры → поперечины → ТФ → АУ → сопряжения
│   │   ├── PlanService.ts           # open/create/import/delete планов ⇄ localStorage; автосохранение
│   │   │                            #   (onChange undo-стека + debounce) и аварийный дамп при падении
│   │   ├── planSchema.ts            # zod-схема PlanDTO + ссылочная целостность (validatePlanDTO)
│   │   ├── deletionMessages.ts      # формулировки последствий удаления для подтверждений
│   │   ├── NotificationService.ts   # интерфейс тостов (+ Memory-заглушка для тестов)
│   │   └── MantineNotificationService.ts  # реализация поверх @mantine/notifications
│   ├── lib/                         # storeContext/servicesContext (useStore/useServices), getCursorStyle
│   └── ui/                          # App.tsx (layout), InteractiveCanvas.tsx (svg + события), провайдеры,
│                                    #   ErrorBoundary.tsx (аварийный дамп плана при падении)
│
├── entities/catenaryPlanGraphic/
│   ├── model/
│   │   ├── Railway.ts               # startX/endX (абс. метры) + picketage (рубленые км)
│   │   ├── Track.ts                 # yOffsetMeters (знак = чёт/нечёт), directionMultiplier, getPositionAtX
│   │   ├── CatenaryPole.ts          # makeObservable явный; trackBindings: TrackBinding[] + явный главный
│   │   │                            #   путь (primaryTrack/primaryBinding/primaryGabarit — computed); pos
│   │   ├── VlPole.ts                # x/y свободные, vlType
│   │   ├── Disconnector.ts          # привязан к опоре (pole + yOffset), controlType/state/phaseCount
│   │   ├── FixingPoint.ts           # pole (X/identity-якорь), track?, yOffset, zigzagValue?,
│   │   │                            #   supportType: pole|crossSpan|structure, crossSpan?
│   │   ├── AnchorSection.ts         # startPole/endPole, fixingPoints[], primaryTrack?, getCatenaryPoses()
│   │   ├── Junction.ts              # section1/section2, type, overlapXRange + anchorPoleIds (computed)
│   │   └── CrossSpan.ts             # spanType: flexible|rigid, poleA/poleB
│   ├── lib/fixingPointListOps.ts    # чистые операции над списком ТФ (move/insert/remove)
│   ├── lib/detectJunctions.ts       # авто-определение сопряжений по общим опорам АУ
│   └── ui/                          # Layer-компоненты (импортируют useStore из @/app — FSD-исключение):
│                                    #   TrackLayer, PoleLayer, VlPoleLayer, FixingPointsLayer, CatenaryLayer,
│                                    #   ZigzagLayer, SpanLengthLayer, WireLineLayer, CrossSpanLayer,
│                                    #   DisconnectorLayer, KmPkScaleLayer, PoleDataTableLayer
│
├── features/
│   ├── plans/{import,export,create} # кнопки/модалки работы с планами (JSON-файл)
│   ├── placementPreview/            # призрак + snap-индикатор
│   ├── selectionRect/               # лассо
│   ├── inlineEdit/                  # InlineEditOverlay — input поверх канвы
│   └── bulkPolesEditor/             # модалка массового создания опор + XLSX-импорт (lib/xlsxUtils)
│
├── widgets/
│   ├── confirmDialog/               # ConfirmDialog — одно окно подтверждения на всё приложение
│   ├── toolbar/                     # кнопки инструментов
│   ├── poleEditor/                  # SinglePoleEditor / BulkPoleEditor (мультивыделение), TrackBindingRow
│   ├── tracksEditor/                # участок + пути + PicketageEditor/NonStandardKmRow (рубленые км)
│   ├── linesEditor/                 # АУ и ВЛ: AnchorSectionRow, WireLineRow, AddFpRow, BulkFpModal
│   ├── junctionsEditor/             # сопряжения: авто-детект + ручное создание (через JunctionService)
│   ├── displaySettings/             # модалка настроек отображения
│   ├── statusBar/                   # подсказки по toolState + undo-описание
│   ├── planHeader/                  # заголовок, SaveIndicator (автосохранение), экспорт/импорт, выход
│   └── plansList/                   # страница списка планов + CrashDumpBanner (аварийная копия)
│
└── shared/
    ├── constants.ts                 # масштабы (CATENARY_POLE_SCALE_Y=10), радиусы hit-test, длины пикета/км
    ├── lib/
    │   ├── measure.ts               # metersToKmPkM / kmPkMToMeters / format* — все принимают picketage
    │   └── picketageOps.ts          # иммутабельные трансформы Picketage + валидация
    ├── svg/                         # svgPath (calcSvgPath), svgCoords (screen↔svg через CTM)
    ├── date/formatDate.ts
    ├── types/
    │   ├── catenaryTypes.ts         # Pos, Pole, Picketage/NonStandardKm, WireType, GroundingType, enum'ы
    │   ├── toolTypes.ts             # EntityType, PlaceableEntityConfig, ViewBox, SnapInfo
    │   └── planTypes.ts             # PlanDTO + DTO всех сущностей (формат сериализации)
    └── ui/                          # SidePanel, KmPkMInput, CollapsibleSection,
                                     #   gost-symbols (~40 ГОСТ SVG), toolbar-icons
```

## FSD: правила

`shared < entities < features < widgets < app`

**FSD-исключение (принято):** `useStore` / `useServices` из `@/app` импортируются в нижние слои.

**НЕ выделять в feature:** однострочные onClick, CRUD-сеттеры форм, бизнес-логика без UI (→ в сервис).

## Единый путь записи (обязательное правило)

UI (widgets / features / entities-ui) **не мутирует доменные сторы и модели напрямую** — только через сервисы:
`EntityService`, `EditService`, `LinesService`, `JunctionService`, `TrackService`, `InlineEditService`, `DragService`.
Каждый публичный метод сервиса = одна команда в undo-стеке.

- Текстовые/числовые поля панелей передают `mergeKey` в `UndoStackStore.execute(cmd, mergeKey)`:
  подряд идущие правки одного поля (окно `MERGE_WINDOW_MS`) схлопываются в одну запись undo.
- Любое удаление строится через `planDeletion(ids, stores)` из `cascadeRules.ts` — каскад описан
  в одном месте, а не размазан по сервисам и панелям.
- Сторы остаются «глупыми» Map-обёртками (add / remove / loadFrom), без каскадов и бизнес-правил.
- Исключение: UI-сторы (`uiPanelsStore`, `selectionStore`, `cameraStore`, `toolStateStore`,
  `inlineEditStore`, `displaySettingsStore`, `saveStatusStore`, `confirmDialogStore`) панели дёргают
  напрямую — они вне undo-стека.

## Автосохранение и обратная связь

- План сохраняется сам: `UndoStackStore.onChange` → `PlanService` с debounce 1 с. Кнопки «Сохранить» нет,
  в шапке — `SaveIndicator`. Всё, что должно попадать в файл плана, обязано идти командой undo-стека:
  прямая мутация модели мимо сервиса не сохранится.
- Действие, которое не может выполниться, обязано объяснить это тостом (`NotificationService`), а не
  «ничего не делать»; необратимое или каскадное — спросить через `confirmDialogStore.ask()`.
  Прямой `window.confirm` / `alert` в коде не используем.

## Ключевые файлы

1. `src/app/compositionRoot.ts` — DI-корень; `src/app/types.ts` — состав Store/Services.
2. `src/app/store/ToolStateStore.ts` — машина состояний инструментов.
3. `src/app/services/InputHandler.ts` — обработчик ввода; `cascadeRules.ts` — правила каскадного удаления.
4. `src/shared/types/` — все типы (catenaryTypes, toolTypes, planTypes).
