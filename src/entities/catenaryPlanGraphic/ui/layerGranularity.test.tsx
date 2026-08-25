/**
 * @vitest-environment jsdom
 *
 * Профилирование разбивки слоёв (п. 6.1 / 6.4 PLAN.md).
 *
 * `observer` из mobx-react-lite заводит на каждый компонент mobx-реакцию с именем
 * `observer<ИмяКомпонента>`; её срабатывание — это ровно то, что React DevTools
 * подсвечивает как перерисовку. Считаем срабатывания через `mobx.spy` и фиксируем:
 * правка одной опоры не должна трогать слой целиком.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { runInAction, spy } from "mobx";
import { afterEach, describe, expect, it } from "vitest";

import { StoreContext } from "@/app/lib/storeContext";
import type { Store } from "@/app/types";
import { createTestData } from "@/app/initMock";
import { CatenaryPoleStore } from "@/app/store/CatenaryPoleStore";
import { TracksStore } from "@/app/store/TracksStore";
import { FixingPointsStore } from "@/app/store/FixingPointsStore";
import { AnchorSectionsStore } from "@/app/store/AnchorSectionsStore";
import { JunctionsStore } from "@/app/store/JunctionsStore";
import { VlPolesStore } from "@/app/store/VlPolesStore";
import { WireLinesStore } from "@/app/store/WireLinesStore";
import { CrossSpansStore } from "@/app/store/CrossSpansStore";
import { DisconnectorsStore } from "@/app/store/DisconnectorsStore";
import { SelectionStore } from "@/app/store/SelectionStore";
import { DisplaySettingsStore } from "@/app/store/DisplaySettingsStore";

import { CatenaryLayer } from "./CatenaryLayer";
import { PoleLayer } from "./PoleLayer";
import { PoleDataTableLayer } from "./PoleDataTableLayer";
import { SpanLengthLayer } from "./SpanLengthLayer";
import { ZigzagLayer } from "./ZigzagLayer";

/** Демо-план × N: N копий createTestData(), разнесённых по X. */
function buildStore(copies: number) {
    const plans = Array.from({ length: copies }, (_, i) => {
        const plan = createTestData();
        const shift = i * 2000;

        if (shift > 0) {
            runInAction(() => {
                plan.poles.forEach((p) => p.setX(p.x + shift));
                plan.vlPoles.forEach((p) => p.setX(p.x + shift));
            });
        }

        return plan;
    });

    const first = plans[0];
    const flat = <T,>(pick: (p: (typeof plans)[number]) => T[]): T[] => plans.flatMap(pick);

    const store = {
        catenaryPoleStore: new CatenaryPoleStore(flat((p) => p.poles)),
        tracksStore: new TracksStore(first.tracks, first.railway),
        fixingPointsStore: new FixingPointsStore(flat((p) => p.fixingPoints)),
        anchorSectionsStore: new AnchorSectionsStore(flat((p) => p.anchorSections)),
        junctionsStore: new JunctionsStore(flat((p) => p.junctions)),
        vlPolesStore: new VlPolesStore(flat((p) => p.vlPoles)),
        wireLinesStore: new WireLinesStore(flat((p) => p.wireLines)),
        crossSpansStore: new CrossSpansStore(flat((p) => p.crossSpans)),
        disconnectorsStore: new DisconnectorsStore([]),
        selectionStore: new SelectionStore(),
        displaySettingsStore: new DisplaySettingsStore(),
    } as unknown as Store;

    return { store, poles: flat((p) => p.poles) };
}

function Canvas({ store }: { store: Store }) {
    return (
        <StoreContext.Provider value={store}>
            <svg>
                <CatenaryLayer />
                <ZigzagLayer />
                <SpanLengthLayer />
                <PoleLayer />
                <PoleDataTableLayer />
            </svg>
        </StoreContext.Provider>
    );
}

// Без этого флага React ругается, что окружение не поддерживает act(...)
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLElement | null = null;

afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
});

function mount(store: Store) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(<Canvas store={store} />));
}

/** Имена компонентов, чьи observer-реакции сработали за время выполнения fn. */
function countRerenders(fn: () => void): Map<string, number> {
    const counts = new Map<string, number>();
    const stopSpy = spy((event) => {
        if (event.type !== "reaction" || !event.name.startsWith("observer")) {
            return;
        }
        const name = event.name.slice("observer".length);
        counts.set(name, (counts.get(name) ?? 0) + 1);
    });

    try {
        act(fn);
    } finally {
        stopSpy();
    }

    return counts;
}

describe("гранулярность перерисовки слоёв", () => {
    const COPIES = 5; // 5 × 42 = 210 опор КС

    it("сдвиг одной опоры не перерисовывает слои целиком", () => {
        const { store, poles } = buildStore(COPIES);
        expect(poles.length).toBe(210);
        mount(store);

        // Опора в середине первого участка: входит в АУ, в два пролёта, несёт ТФ с зигзагом
        const pole = poles[5];
        const counts = countRerenders(() => runInAction(() => pole.setX(pole.x + 1)));

        // Слои-контейнеры собирают только структуру и координат не читают
        expect(counts.get("PoleLayerBase")).toBeUndefined();
        expect(counts.get("SpanLengthLayerBase")).toBeUndefined();
        expect(counts.get("CatenaryLayerBase")).toBeUndefined();
        expect(counts.get("ZigzagLayerBase")).toBeUndefined();

        // Квантованные границы и порядок столбцов не изменились → таблица стоит на месте
        expect(counts.get("PoleDataTableLayerBase")).toBeUndefined();
        expect(counts.get("TableGridBase")).toBeUndefined();

        // Перерисовалось только то, что действительно сдвинулось
        expect(counts.get("PoleFigureSvgBase")).toBe(1);
        expect(counts.get("PoleColumnBase")).toBe(1);
        expect(counts.get("ZigzagFigureBase")).toBe(1);
        expect(counts.get("SpanLengthFigureBase")).toBe(2); // пролёты слева и справа от опоры
        expect(counts.get("SectionCatenaryBase")).toBe(1); // одна АУ из 3 × COPIES
    });

    it("переименование опоры трогает только её подпись и её столбец таблицы", () => {
        const { store, poles } = buildStore(COPIES);
        mount(store);

        const pole = poles[5];
        const counts = countRerenders(() => runInAction(() => pole.setName("999")));

        expect([...counts.keys()].sort()).toEqual(["PoleColumnBase", "PoleFigureSvgBase"]);
    });
});
