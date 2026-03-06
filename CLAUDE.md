# АС План КС — Claude Code Context

## Проект

Web-приложение для генерации планов контактной сети (КС) железных дорог по ГОСТ/Порядку ОАО «РЖД» 2023.
SVG-отрисовка, только просмотр/экспорт, без бэкенда.

## Стек

- React 18 + Vite + TypeScript
- MobX (`makeObservable` / `makeAutoObservable`) — основа реактивности
- SVG (не Canvas)
- FSD (Feature Sliced Design) (на данный момент архитектура в полной мере не соответствует методологии)

## Структура проекта

```
src/
├── app/
│   ├── index.tsx                    # Корневой компонент: SVG-холст, pan/zoom
│   ├── compositionRoot.ts           # DI: создаёт Store + Services, тестовые данные
│   ├── store/
│   │   ├── model/
│   │   │   │   ├── types.ts             # interface Store (все сторы)
│   │   │   ├── UIStore.ts           # selectedPoleId, selectPole(), deselectPole()
│   │   │   ├── PolesStore.ts        # Map<string, CatenaryPole>
│   │   │   ├── TracksStore.ts       # Map<string, Track>
│   │   │   ├── FixingPointsStore.ts # Map<string, FixingPoint>
│   │   │   ├── AnchorSectionsStore.ts
│   │   │   ├── JunctionsStore.ts    # insulatingJunctionAnchorPoleIds (computed Set)
│   │   │   ├── VlPolesStore.ts      # Map<string, VlPole>
│   │   │   ├── WireLinesStore.ts    # Map<string, WireLine>
│   │   │   └── CrossSpansStore.ts   # Map<string, FlexibleCrossSpan | RigidCrossSpan>
│   │   └── ui/
│   │       ├── StoreProvider.tsx
│   │       └── storeContext.tsx     # useStore() hook
│   └── services/
│       ├── model/types.ts           # interface Services { svgDrawer }
│       └── ui/
│           ├── ServicesProvider.tsx
│           └── servicesContext.tsx  # useServices() hook
│
├── entities/
│   ├── lib/                         # Доменные модели
│   │   ├── Railway.ts               # Ось дороги: startX/endX, getPositionAtX(x)
│   │   ├── Track.ts                 # Путь: смещение от оси, getPositionAtX(x)
│   │   ├── IPole.ts                 # interface IPole { id, x, name, radius, pos }
│   │   ├── CatenaryPole.ts          # Опора КС implements IPole: MobX observable явный, pos (computed), setters (actions)
│   │   ├── VlPole.ts                # Опора ВЛ implements IPole: makeAutoObservable, vlType, pos (computed)
│   │   ├── FixingPoint.ts           # Точка фиксации провода: pole (IPole), track?, yOffset, zigzagValue?; startPos/endPos — геттеры
│   │   ├── WireLine.ts              # Провод/линия: wireType, label?, fixingPoints[]
│   │   ├── CrossSpan.ts             # ICrossSpan, FlexibleCrossSpan, RigidCrossSpan (poleA, poleB: CatenaryPole)
│   │   └── AnchorSection.ts         # Анкерный участок: startPole, endPole (CatenaryPole), fixingPoints[], getCatenaryPoses(overlapRange?)
│   └── catenaryPlanGraphic/         # SVG-компоненты плана
│       ├── gost-symbols.tsx         # ~40 ГОСТ SVG-компонентов + getWireDashArray/getWireInsertSymbol
│       ├── PoleLayer.tsx            # observer + memo, onClick → uiStore.selectPole()
│       ├── TrackLayer.tsx
│       ├── FixingPointsLayer.tsx    # observer, рисует консоли опора↔путь
│       ├── FixingPointFigure.tsx    # observer (важно — реагирует на смену опоры)
│       ├── CatenaryLayer.tsx        # observer, рисует подвеску по AnchorSection.getCatenaryPoses()
│       ├── ZigzagLayer.tsx          # зигзаги
│       ├── ZigzagFigure.tsx
│       ├── SpanLengthLayer.tsx      # длины пролётов
│       ├── VlPoleLayer.tsx          # observer, рисует опоры ВЛ (VlPoleSymbol)
│       ├── WireLineLayer.tsx        # observer, рисует доп. провода (WireType → dashArray + вставной символ)
│       └── TrackFigure.tsx
│
├── features/
│   └── poleEditor/
│       └── ui/PoleEditorPanel.tsx   # Правая панель редактирования выбранной опоры
│
└── shared/
    ├── types.ts                     # Pos, RailwayDirection, CatenaryType, WireType, SupportStructureType...
    ├── constants.ts                 # ZIGZAG_DRAW_SCALE и др.
    └── utils/SVGDrawer.ts           # calcSVGPath(poses: Pos[]): string
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
- **CrossSpan** — поперечина: `FlexibleCrossSpan` / `RigidCrossSpan`, оба `implements ICrossSpan { id, poleA, poleB: CatenaryPole }`. Отдельная сущность верхнего уровня (не вложена в опору). Рендеринг — Этап 4.
- **Store** — все entity-сторы создаются в `compositionRoot.ts::init()`. Layer-компоненты не принимают пропсы, читают сторы через `useStore()`.
- **ID** — `crypto.randomUUID()`
- **SVG-компоненты** из `gost-symbols.tsx` — использовать как есть, символы могут уточняться по ходу вручную.

## Известные ограничения (не баги)

- `CatenaryPole._calculateGlobalPosY()` возвращает позицию только по **первому треку** из `_tracks`. Для текущих данных (каждая опора → один трек) корректно. Сломается когда опора между двумя путями. Решение — при появлении таких опор.
- Тестовые данные захардкожены в `compositionRoot.ts` → `createTestData()`. Позже вынести в отдельный файл или в импорт JSON.

## Статус этапов

| # | Название | Статус |
|---|----------|--------|
| 1 | ГОСТ-символы (PoleBase, ConsoleSymbol, AnchorGuy, AnchorBrace) | ✅ Готово |
| 2 | Контактная подвеска (AnchorSection, CatenaryLayer) | ✅ Готово (AnchorSectionArrow — нет) |
| 3 | Доп. провода (ДПР, питающий, ВЛ) | 🔄 В процессе (VlPole, WireLine, WireLineLayer реализованы) |
| 4 | Типы опор (промежуточная / анкерная / фиксирующая) | ✅ Готово |
| 5 | Зигзаги, номера опор, длины пролётов | ✅ Готово |
| 6 | Сопряжения анкерных участков | ✅ Готово |
| 7 | Средние анкеровки | ⬜ Не начато |
| 8 | MobX Store + правая панель редактирования | ✅ Готово |
| 9 | Таблица-сетка и спецификация | ⬜ Не начато |

**Текущий этап: Этап 3** (инфраструктура готова: VlPole, WireLine, WireLineLayer, VlPoleLayer; нужны тестовые данные и уточнение символов)

**Данные зигзага:** `FixingPoint.zigzagValue?: number` (мм, знак = направление: +250 от опоры, -250 к опоре).

**Этап 6 — ключевые решения:**
- Зигзаг влияет на отрисовку пути КС: позиция = `endPos.y + zigzagValue * ZIGZAG_DRAW_SCALE` (`src/shared/constants.ts`)
- Зигзаг в CatenaryLayer/ZigzagLayer применяется ТОЛЬКО внутри `Junction.overlapXRange`.
- В overlap-зоне сопряжения каждая секция имеет **отдельные** объекты `FixingPoint` (иначе невозможно задать разные зигзаги для одного полюса в разных секциях). Переходные опоры имеют 2 консоли — физически корректно.
- Синие опоры ИС: `CatenaryPole.isInsulatingJunctionAnchor: boolean` (MobX observable), задаётся в compositionRoot.
- Изоляторы — отложены до следующих этапов.
- **MobX в CatenaryPole.ts**: `makeObservable(this, { field: observable, ... })` — обязательно явные аннотации (decorators не включены в tsconfig).

## Ключевые файлы для чтения

При старте новой сессии или задачи:
1. `docs/gost-reference.md` — справочник символов ГОСТ
2. `src/entities/catenaryPlanGraphic/gost-symbols.tsx` — все готовые SVG-компоненты. Они сгенерированы и могут быть не совсем корректны. При использовании будет произведена их корректировка
3. `src/entities/lib/<нужный класс>` — доменная модель
4. `src/app/compositionRoot.ts` — тестовые данные и структура объектов
5. `./DEFINITIONS.md` - основные понятия инструкции по эксплуатации контактной сети РЖД
