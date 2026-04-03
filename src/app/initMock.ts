import { CatenaryType, RelativeSidePosition } from "@/shared/types/catenaryTypes";
import {
    CatenaryPole,
    Track,
    Railway,
    FixingPoint,
    AnchorSection,
    Junction,
    VlPole,
    WireLine,
    CrossSpan,
} from "@/entities/catenaryPlanGraphic";

// Реалистичные расстояния пролётов (м): варьируются от 40 до 70м, как в реальной практике
const SPAN_LENGTHS = [55, 62, 58, 65, 50, 60, 57, 63, 48, 55, 60, 52, 67, 61, 56, 64, 49, 58, 60, 53];

function buildXPositions(spans: number[]): number[] {
    const xs: number[] = [0];
    for (const span of spans) {
        xs.push(xs[xs.length - 1] + span);
    }
    return xs;
}

export function createTestData() {
    const railway = new Railway({
        startX: 0,
        endX: 12000,
        name: "Малиногорка - Козулька",
    });

    const track1 = new Track({
        yOffsetMeters: -5,
        startX: railway.startX,
        endX: railway.endX,
        name: "I",
        railway,
    });

    const track2 = new Track({
        yOffsetMeters: 5,
        startX: railway.startX,
        endX: railway.endX,
        name: "II",
        railway,
    });

    const xPositions = buildXPositions(SPAN_LENGTHS); // 21 точка для 20 пролётов

    // Опоры II пути (нечётные номера по полевой стороне)
    const track2Poles: CatenaryPole[] = xPositions.map(
        (x, i) =>
            new CatenaryPole({
                x,
                name: `${2 * (i + 1)}`,
                tracks: {
                    [track2.id]: {
                        gabarit: 3.1,
                        relativePositionToTrack: RelativeSidePosition.RIGHT,
                        track: track2,
                    },
                },
            }),
    );

    // Опоры I пути (чётные номера по полевой стороне)
    const track1Poles: CatenaryPole[] = xPositions.map(
        (x, i) =>
            new CatenaryPole({
                x,
                name: `${2 * (i + 1) - 1}`,
                material: "metal",
                tracks: {
                    [track1.id]: {
                        gabarit: 3.1,
                        relativePositionToTrack: RelativeSidePosition.RIGHT,
                        track: track1,
                    },
                },
            }),
    );

    const poles = [...track2Poles, ...track1Poles];

    // --- Анкерные участки II пути ---
    // Секция A: track2Poles[0..14], Секция B: track2Poles[10..20]
    // Overlap-зона: poles[10..14]
    const sectionAFPs: FixingPoint[] = track2Poles
        .slice(0, 15)
        .map((p, i) => (i === 0 ? new FixingPoint({ pole: p }) : new FixingPoint({ pole: p, track: track2 })));
    const sectionBFPs: FixingPoint[] = track2Poles
        .slice(10, 21)
        .map((p) => new FixingPoint({ pole: p, track: track2 }));

    // --- Анкерный участок I пути ---
    const sectionCFPs: FixingPoint[] = track1Poles
        .slice(0, 21)
        .map((p) => new FixingPoint({ pole: p, track: track1 }));

    // Зигзаги секции A
    sectionAFPs.forEach((fp, i) => {
        if (i === 0) return;
        fp.zigzagValue = i >= 10 && i <= 13 ? 400 : i % 2 === 0 ? 250 : -250;
    });

    // Зигзаги секции B
    sectionBFPs.forEach((fp, i) => {
        if (i === 0) return;
        fp.zigzagValue = i >= 1 && i <= 4 ? -400 : i % 2 === 0 ? 250 : -250;
    });

    // Зигзаги секции C (I путь)
    sectionCFPs.forEach((fp, i) => {
        if (i === 0) return;
        fp.zigzagValue = i % 2 === 0 ? 250 : -250;
    });

    const catenaryFixingPoints = [...sectionAFPs, ...sectionBFPs, ...sectionCFPs];

    // --- Оттяжки и подкосы ---
    track2Poles[0].setAnchorGuy({ direction: RelativeSidePosition.LEFT, type: "double" });
    track2Poles[10].setAnchorGuy({ direction: RelativeSidePosition.LEFT, type: "double" });
    track2Poles[14].setAnchorGuy({ direction: RelativeSidePosition.RIGHT, type: "double" });
    track2Poles[20].setAnchorGuy({ direction: RelativeSidePosition.RIGHT, type: "single" });
    track1Poles[0].setAnchorBrace({ direction: RelativeSidePosition.RIGHT });
    track1Poles[0].setAnchorGuy({ direction: RelativeSidePosition.LEFT, type: "single" });
    track1Poles[20].setAnchorGuy({ direction: RelativeSidePosition.RIGHT, type: "single" });

    // --- Заземления ---
    poles[2].setGrounding("И");
    poles[5].setGrounding("ИДЗ");
    poles[12].setGrounding("ГДЗ");
    poles[21].setGrounding("ИИ");

    const anchorSections: AnchorSection[] = [
        new AnchorSection({
            name: "АУ-1",
            startPole: track2Poles[0],
            endPole: track2Poles[14],
            fixingPoints: sectionAFPs,
            type: CatenaryType.CS140,
            primaryTrack: track2,
        }),
        new AnchorSection({
            name: "АУ-2",
            startPole: track2Poles[10],
            endPole: track2Poles[20],
            fixingPoints: sectionBFPs,
            type: CatenaryType.CS140,
            primaryTrack: track2,
        }),
        new AnchorSection({
            name: "АУ-3",
            startPole: track1Poles[0],
            endPole: track1Poles[20],
            fixingPoints: sectionCFPs,
            type: CatenaryType.CS140,
            primaryTrack: track1,
        }),
    ];

    const junctions: Junction[] = [
        new Junction({
            section1: anchorSections[0],
            section2: anchorSections[1],
            type: "insulating",
        }),
    ];

    // --- Поперечины ---
    const crossSpans = [
        new CrossSpan({ spanType: "flexible", poleA: track1Poles[3], poleB: track2Poles[3] }),
        new CrossSpan({ spanType: "flexible", poleA: track1Poles[7], poleB: track2Poles[7] }),
        new CrossSpan({ spanType: "flexible", poleA: track1Poles[14], poleB: track2Poles[14] }),
        new CrossSpan({ spanType: "rigid", poleA: track1Poles[0], poleB: track2Poles[0] }),
        new CrossSpan({ spanType: "rigid", poleA: track1Poles[10], poleB: track2Poles[10] }),
        new CrossSpan({ spanType: "rigid", poleA: track1Poles[20], poleB: track2Poles[20] }),
    ];

    // --- ВЛ-опоры ---
    const vlPole1 = new VlPole({ x: xPositions[2], y: 200, name: "В1", vlType: "intermediate" });
    const vlPole2 = new VlPole({ x: xPositions[6], y: 200, name: "В2", vlType: "intermediate" });
    const vlPole3 = new VlPole({ x: xPositions[10], y: 200, name: "В3", vlType: "terminal" });
    const vlPoles = [vlPole1, vlPole2, vlPole3];

    const vlFixingPoints = vlPoles.map((p) => new FixingPoint({ pole: p, yOffset: 1 }));
    const vlLine = new WireLine({
        wireType: "vl",
        label: "ВЛ-АБ",
        fixingPoints: vlFixingPoints,
    });

    // ДПР на КС-опорах II пути
    const dprFixingPoints = track2Poles.slice(0, 15).map((p) => new FixingPoint({ pole: p, yOffset: 30 }));
    const dprLine = new WireLine({
        wireType: "return_air",
        fixingPoints: dprFixingPoints,
    });

    const wireLines = [vlLine, dprLine];
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
        crossSpans,
    };
}
