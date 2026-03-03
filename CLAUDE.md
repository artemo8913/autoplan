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
│   │   │   ├── projectStore.ts      # ProjectStore (MobX): railway, tracks[], poles[], attachments[], anchorSections[]
│   │   │   └── types.ts             # interface Store
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
│   │   ├── Pole.ts                  # Опора: MobX observable, pos (computed)
│   │   ├── Attachment.ts            # Консоль опора↔путь: startPos/endPos (геттеры)
│   │   └── AnchorSection.ts         # Анкерный участок: startPole, endPole, attachments[]
│   └── catenaryPlanGraphic/         # SVG-компоненты плана
│       ├── gost-symbols.tsx         # ~40 ГОСТ SVG-компонентов
│       ├── PoleLayer.tsx            # observer + memo, onClick → projectStore.selectPole()
│       ├── TrackLayer.tsx
│       ├── AttachmentsLayer.tsx
│       ├── CatenaryLayer.tsx        # observer, рисует подвеску по AnchorSection.poses
│       ├── TrackFigure.tsx
│       └── AttachmentFigure.tsx     # observer (важно — без него attachment не реагирует на смену опоры)
│
├── features/
│   └── poleEditor/
│       └── ui/PoleEditorPanel.tsx   # Правая панель редактирования выбранной опоры
│
└── shared/
    ├── types.ts                     # Pos, RailwayDirection, RelativeSidePosition, CatenaryType, WireType...
    └── utils/SVGDrawer.ts           # calcSVGPath(poses: Pos[]): string
```

## Архитектурные решения

- **Кривые не реализуем** — пути всегда прямые (п. 2.12 Порядка). `getPositionAtX(x)` возвращает `{x, y: константа}`.
- **Railway/Track не хранят словари поз** — только `getPositionAtX(x: number): Pos`. Для поддержки будущих кривых нужно менять только этот метод.
- **Attachment** — отдельная сущность (отношение Pole↔Track), не часть Pole. `startPos`/`endPos` — геттеры, вычисляются из актуальных позиций. Компонент обязательно `observer`.
- **Pole** — MobX observable (`makeObservable` явный, не auto). `pos` — `computed`. Мутации только через setters (action).
- **anchorGuy / anchorBrace** — поля самой опоры, часть класса Pole (в отличие от Attachment — это не связь с другим объектом, а свойство самой опоры).
- **ID** — `crypto.randomUUID()`
- **SVG-компоненты** из `gost-symbols.tsx` — использовать как есть, символы могут уточняться по ходу вручную.

## Известные ограничения (не баги)

- `Pole._calculateGlobalPosY()` возвращает позицию только по **первому треку** из `_tracks`. Для текущих данных (каждая опора → один трек) корректно. Сломается при жёстких поперечинах (опора между двумя путями). Решение — при появлении таких опор.
- Тестовые данные захардкожены в `compositionRoot.ts` → `createTestData()`. Позже вынести в отдельный файл или в импорт JSON.

## Статус этапов

| # | Название | Статус |
|---|----------|--------|
| 1 | ГОСТ-символы (PoleBase, ConsoleSymbol, AnchorGuy, AnchorBrace) | ✅ Готово |
| 2 | Контактная подвеска (AnchorSection, CatenaryLayer) | ✅ Готово (AnchorSectionArrow — нет) |
| 3 | Доп. провода (ДПР, питающий, ВЛ) | ⬜ Не начато |
| 4 | Типы опор (промежуточная / анкерная / фиксирующая) | ✅ Готово |
| 5 | Зигзаги, номера опор, длины пролётов | ⬜ Не начато |
| 6 | Сопряжения анкерных участков | ⬜ Не начато |
| 7 | Средние анкеровки | ⬜ Не начато |
| 8 | MobX Store + правая панель редактирования | ✅ Готово |
| 9 | Таблица-сетка и спецификация | ⬜ Не начато |

**Следующий приоритет: Этап 5** — зигзаги (`ZigzagSymbol`), номера опор (`PoleNumberLabel`), длины пролётов (`SpanLengthLabel`). Все символы уже есть в `gost-symbols.tsx`.

## Ключевые файлы для чтения

При старте новой сессии или задачи:
1. `docs/gost-reference.md` — справочник символов ГОСТ
2. `src/entities/catenaryPlanGraphic/gost-symbols.tsx` — все готовые SVG-компоненты
3. `src/entities/lib/<нужный класс>` — доменная модель
4. `src/app/compositionRoot.ts` — тестовые данные и структура объектов
