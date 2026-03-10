import { SVGDrawer } from "@/shared/utils/SVGDrawer";
import { CatenaryType, RelativeSidePosition } from "@/shared/types";
import { CatenaryPole } from "@/entities/lib/CatenaryPole";
import { Track } from "@/entities/lib/Track";
import { Railway } from "@/entities/lib/Railway";
import { CounterStore } from "@/entities/counter";
import { FixingPoint } from "@/entities/lib/FixingPoint";
import { AnchorSection } from "@/entities/lib/AnchorSection";
import { Junction } from "@/entities/lib/Junction";
import { VlPole } from "@/entities/lib/VlPole";
import { WireLine } from "@/entities/lib/WireLine";

import type { Store } from "./store";
import type { Services } from "./services";
import { UIStore } from "./store/model/UIStore";
import { PolesStore } from "./store/model/PolesStore";
import { TracksStore } from "./store/model/TracksStore";
import { FixingPointsStore } from "./store/model/FixingPointsStore";
import { AnchorSectionsStore } from "./store/model/AnchorSectionsStore";
import { JunctionsStore } from "./store/model/JunctionsStore";
import { VlPolesStore } from "./store/model/VlPolesStore";
import { WireLinesStore } from "./store/model/WireLinesStore";
import { CrossSpansStore } from "./store/model/CrossSpansStore";

function createTestData() {
    const railway = new Railway({
        startX: 0,
        endX: 10000,
        name: "Малиногорка - Козулька"
    });

    const track1 = new Track({
        direction: "odd",
        startX: railway.startX,
        endX: railway.endX,
        name: "I",
        railway,
    });

    const track2 = new Track({
        direction: "even",
        startX: railway.startX,
        endX: railway.endX,
        name: "II",
        railway,
    });

    // Опоры II пути (чётный, track2), indices 0..19
    const track2Poles: CatenaryPole[] = new Array(20).fill(null).map((_, i) => new CatenaryPole({
        x: 100 * i,
        name: `${2 * (i + 1)}`,
        tracks: {
            [track2.id]: {
                gabarit: 3.1,
                relativePositionToTrack: RelativeSidePosition.RIGHT,
                track: track2
            }
        }
    }));

    // Опоры I пути (нечётный, track1), indices 0..19
    const track1Poles: CatenaryPole[] = new Array(20).fill(null).map((_, i) => new CatenaryPole({
        x: 100 * i,
        name: `${2 * (i + 1) - 1}`,
        material: "metal",
        tracks: {
            [track1.id]: {
                gabarit: 3.1,
                relativePositionToTrack: RelativeSidePosition.RIGHT,
                track: track1
            }
        }
    }));

    const poles = [...track2Poles, ...track1Poles];

    // --- Анкерные участки II пути ---
    // Секция A: track2Poles[0..14]
    // Секция B: track2Poles[10..19] — overlap-зона с секцией A: poles[10..14]
    const sectionAFPs: FixingPoint[] = track2Poles.slice(0, 15).map((p, i) => i === 0
        ? new FixingPoint({pole: p})
        : new FixingPoint({pole: p, track: track2}));
    const sectionBFPs: FixingPoint[] = track2Poles.slice(10, 20).map(p => new FixingPoint({pole: p, track: track2}));

    // --- Анкерный участок I пути ---
    const sectionCFPs: FixingPoint[] = track1Poles.slice(0, 20).map(p => new FixingPoint({pole: p, track: track1}));

    // Зигзаги секции A: нормальный ±250 на промежуточных; +400 в overlap-зоне (indices 10..13 — не анкерные)
    sectionAFPs.forEach((fp, i) => {
        if (i === 0) return; // анкерная опора — нет зигзага
        if (i >= 10 && i <= 13) {
            fp.zigzagValue = 400; // overlap-зона: смещение вверх
        } else {
            fp.zigzagValue = i % 2 === 0 ? 250 : -250;
        }
    });

    // Зигзаги секции B: нормальный ±250; -400 в overlap-зоне (indices 1..4 = poles[11..14], не анкерные)
    sectionBFPs.forEach((fp, i) => {
        if (i === 0) return; // анкерная опора (track2Poles[10]) — нет зигзага
        if (i >= 1 && i <= 4) {
            fp.zigzagValue = -400; // overlap-зона: смещение вниз
        } else {
            fp.zigzagValue = i % 2 === 0 ? 250 : -250;
        }
    });

    // Зигзаги секции C (I путь): нормальный ±250
    sectionCFPs.forEach((fp, i) => {
        if (i === 0) return;
        fp.zigzagValue = i % 2 === 0 ? 250 : -250;
    });

    // FixingPoints для КС (переходные опоры имеют 2 консоли — это корректно)
    const catenaryFixingPoints = [...sectionAFPs, ...sectionBFPs, ...sectionCFPs];

    // Заземления
    poles[2].setGrounding("И");
    poles[5].setGrounding("ИДЗ");
    poles[12].setGrounding("ГДЗ");
    poles[20].setGrounding("ИИ");

    // Оттяжки/подкосы
    track2Poles[0].setAnchorGuy({ direction: RelativeSidePosition.LEFT, type: "double" });
    track2Poles[10].setAnchorGuy({ direction: RelativeSidePosition.LEFT, type: "double" });
    track2Poles[14].setAnchorGuy({ direction: RelativeSidePosition.RIGHT, type: "double" });
    track2Poles[19].setAnchorGuy({ direction: RelativeSidePosition.RIGHT, type: "single" });
    track1Poles[0].setAnchorBrace({ direction: RelativeSidePosition.RIGHT });
    track1Poles[0].setAnchorGuy({ direction: RelativeSidePosition.LEFT, type: "single" });
    track1Poles[19].setAnchorGuy({ direction: RelativeSidePosition.RIGHT, type: "single" });

    const anchorSections: AnchorSection[] = [
        new AnchorSection({
            startPole: track2Poles[0],
            endPole: track2Poles[14],
            fixingPoints: sectionAFPs,
            type: CatenaryType.CS140
        }),
        new AnchorSection({
            startPole: track2Poles[10],
            endPole: track2Poles[19],
            fixingPoints: sectionBFPs,
            type: CatenaryType.CS140
        }),
        new AnchorSection({
            startPole: track1Poles[0],
            endPole: track1Poles[19],
            fixingPoints: sectionCFPs,
            type: CatenaryType.CS140
        })
    ];

    const junctions: Junction[] = [
        new Junction({
            section1: anchorSections[0],
            section2: anchorSections[1],
            type: "insulating",
        }),
    ];

    // --- ВЛ-опоры в поле (полевая сторона чётного пути, y > +101) ---
    const vlPole1 = new VlPole({ x: 200, y: 200, name: "В1", vlType: "intermediate" });
    const vlPole2 = new VlPole({ x: 600, y: 200, name: "В2", vlType: "intermediate" });
    const vlPole3 = new VlPole({ x: 1000, y: 200, name: "В3", vlType: "terminal" });
    const vlPoles = [vlPole1, vlPole2, vlPole3];

    // ВЛ-линия между ВЛ-опорами
    const vlFixingPoints = vlPoles.map(p => new FixingPoint({pole: p, yOffset: 1}));
    const vlLine = new WireLine({
        wireType: "vl",
        label: "ВЛ-АБ",
        fixingPoints: vlFixingPoints,
    });

    // ДПР на КС-опорах II пути, полевая сторона (yOffset = +30 SVG ≈ 3м дальше в поле)
    const dprFixingPoints = track2Poles.slice(0, 15).map(p => new FixingPoint({pole: p, yOffset: 30}));
    const dprLine = new WireLine({
        wireType: "return_air",
        fixingPoints: dprFixingPoints,
    });

    const wireLines = [vlLine, dprLine];

    // Все fixing points для FixingPointsLayer (кронштейны на опорах)
    const allFixingPoints = [...catenaryFixingPoints, ...vlFixingPoints, ...dprFixingPoints];

    return {
        railway,
        tracks: [track1, track2],
        poles,
        fixingPoints: allFixingPoints,
        anchorSections,
        junctions,
        vlPoles,
        wireLines,
    };
}

export function init(): {services: Services, store: Store} {
    const svgDrawer = new SVGDrawer();
    const data = createTestData();

    return {
        services: { svgDrawer },
        store: {
            counterStore: new CounterStore(),
            uiStore: new UIStore(),
            polesStore: new PolesStore(data.poles),
            tracksStore: new TracksStore(data.tracks),
            fixingPointsStore: new FixingPointsStore(data.fixingPoints),
            anchorSectionsStore: new AnchorSectionsStore(data.anchorSections),
            junctionsStore: new JunctionsStore(data.junctions),
            vlPolesStore: new VlPolesStore(data.vlPoles),
            wireLinesStore: new WireLinesStore(data.wireLines),
            crossSpansStore: new CrossSpansStore([]),
        }
    };
}
