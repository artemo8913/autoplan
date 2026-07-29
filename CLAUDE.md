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
│   │   ├── UndoStackStore.ts        # Command pattern, maxSize=100; BatchCommand внутри
│   │   ├── UIPanelsStore.ts         # видимость боковых панелей/модалок
│   │   ├── InlineEditStore.ts       # состояние inline-редактирования на канве
│   │   ├── DisplaySettingsStore.ts  # настройки отображения (localStorage, autorun-сохранение)
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
│   │   ├── EntityService.ts         # создание сущностей + каскадное удаление опор; всё через undo
│   │   ├── EditService.ts           # bulk-редактирование свойств опор (через undo)
│   │   ├── InlineEditService.ts     # dblclick-редактирование лейблов: имя опоры, зигзаг, длина пролёта
│   │   ├── HitTestService.ts        # hitTest → сущность; hitTestRect (лассо); hitTestEditTarget (лейблы)
│   │   ├── SnapService.ts           # calcSnap: ближайшие пути сверху/снизу от курсора + сетка (шаг 1 м)
│   │   ├── CameraService.ts         # pan/zoom поверх CameraStore + ToolStateStore
│   │   ├── PlanSerializationService.ts  # toDTO/fromDTO; порядок восстановления:
│   │   │                            #   пути → опоры → поперечины → ТФ → АУ → сопряжения
│   │   └── PlanService.ts           # open/create/import/delete/save планов ⇄ localStorage
│   ├── lib/                         # storeContext/servicesContext (useStore/useServices), getCursorStyle
│   └── ui/                          # App.tsx (layout), InteractiveCanvas.tsx (svg + события), провайдеры
│
├── entities/catenaryPlanGraphic/
│   ├── model/
│   │   ├── Railway.ts               # startX/endX (абс. метры) + picketage (рубленые км)
│   │   ├── Track.ts                 # yOffsetMeters (знак = чёт/нечёт), directionMultiplier, getPositionAtX
│   │   ├── CatenaryPole.ts          # makeObservable явный; tracks: PoleToTracksRelations; pos (computed)
│   │   ├── VlPole.ts                # x/y свободные, vlType
│   │   ├── Disconnector.ts          # привязан к опоре (pole + yOffset), controlType/state/phaseCount
│   │   ├── FixingPoint.ts           # pole (X/identity-якорь), track?, yOffset, zigzagValue?,
│   │   │                            #   supportType: pole|crossSpan|structure, crossSpan?
│   │   ├── AnchorSection.ts         # startPole/endPole, fixingPoints[], primaryTrack?, getCatenaryPoses()
│   │   ├── Junction.ts              # section1/section2, type, overlapXRange + anchorPoleIds (computed)
│   │   └── CrossSpan.ts             # spanType: flexible|rigid, poleA/poleB
│   ├── lib/fixingPointListOps.ts    # чистые операции над списком ТФ (move/insert/remove)
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
│   ├── toolbar/                     # кнопки инструментов
│   ├── poleEditor/                  # SinglePoleEditor / BulkPoleEditor (мультивыделение), TrackBindingRow
│   ├── tracksEditor/                # участок + пути + PicketageEditor/NonStandardKmRow (рубленые км)
│   ├── linesEditor/                 # АУ и ВЛ: AnchorSectionRow, WireLineRow, AddFpRow, BulkFpModal
│   ├── junctionsEditor/             # сопряжения: авто-детект (lib/detectJunctions) + ручное создание
│   ├── displaySettings/             # модалка настроек отображения
│   ├── statusBar/                   # подсказки по toolState + undo-описание
│   ├── planHeader/                  # заголовок, сохранить/экспорт/импорт, выход к списку
│   └── plansList/                   # страница списка планов
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

## Ключевые файлы

1. `src/app/compositionRoot.ts` — DI-корень; `src/app/types.ts` — состав Store/Services.
2. `src/app/store/ToolStateStore.ts` — машина состояний инструментов.
3. `src/app/services/InputHandler.ts` — обработчик ввода.
4. `src/shared/types/` — все типы (catenaryTypes, toolTypes, planTypes).
