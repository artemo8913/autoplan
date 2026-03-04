
import { SVGDrawer } from "@/shared/utils/SVGDrawer";
import { CatenaryType, RelativeSidePosition } from "@/shared/types";
import { Pole } from "@/entities/lib/Pole";
import { Track } from "@/entities/lib/Track";
import { Railway } from "@/entities/lib/Railway";
import { CounterStore } from "@/entities/counter";
import { Attachment } from "@/entities/lib/Attachment";
import { AnchorSection } from "@/entities/lib/AnchorSection";
import { Junction } from "@/entities/lib/Junction";

import type { Store } from "./store";
import type { Services } from "./services";
import { UIStore } from "./store/model/UIStore";
import { PolesStore } from "./store/model/PolesStore";
import { TracksStore } from "./store/model/TracksStore";
import { AttachmentsStore } from "./store/model/AttachmentsStore";
import { AnchorSectionsStore } from "./store/model/AnchorSectionsStore";
import { JunctionsStore } from "./store/model/JunctionsStore";

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
    const track2Poles: Pole[] = new Array(20).fill(null).map((_, i) => new Pole({
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
    const track1Poles: Pole[] = new Array(20).fill(null).map((_, i) => new Pole({
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
    const sectionAAttachments: Attachment[] = track2Poles.slice(0, 15).map(p => new Attachment(p, track2));
    const sectionBAttachments: Attachment[] = track2Poles.slice(10, 20).map(p => new Attachment(p, track2));

    // --- Анкерный участок I пути ---
    const sectionCAttachments: Attachment[] = track1Poles.slice(0, 20).map(p => new Attachment(p, track1));

    // Зигзаги секции A: нормальный ±250 на промежуточных; +400 в overlap-зоне (indices 10..13 — не анкерные)
    sectionAAttachments.forEach((a, i) => {
        if (i === 0) return; // анкерная опора — нет зигзага
        if (i >= 10 && i <= 13) {
            a.zigzagValue = 400; // overlap-зона: смещение вверх
        } else {
            a.zigzagValue = i % 2 === 0 ? 250 : -250;
        }
    });

    // Зигзаги секции B: нормальный ±250; -400 в overlap-зоне (indices 1..4 = poles[11..14], не анкерные)
    sectionBAttachments.forEach((a, i) => {
        if (i === 0) return; // анкерная опора (track2Poles[10]) — нет зигзага
        if (i >= 1 && i <= 4) {
            a.zigzagValue = -400; // overlap-зона: смещение вниз
        } else {
            a.zigzagValue = i % 2 === 0 ? 250 : -250;
        }
    });

    // Зигзаги секции C (I путь): нормальный ±250
    sectionCAttachments.forEach((a, i) => {
        if (i === 0) return;
        a.zigzagValue = i % 2 === 0 ? 250 : -250;
    });

    // Все вложения для AttachmentsLayer (переходные опоры имеют 2 консоли — это корректно)
    const attachments = [...sectionAAttachments, ...sectionBAttachments, ...sectionCAttachments];

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
            attachments: sectionAAttachments,
            type: CatenaryType.CS140
        }),
        new AnchorSection({
            startPole: track2Poles[10],
            endPole: track2Poles[19],
            attachments: sectionBAttachments,
            type: CatenaryType.CS140
        }),
        new AnchorSection({
            startPole: track1Poles[0],
            endPole: track1Poles[19],
            attachments: sectionCAttachments,
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

    return { railway, tracks: [track1, track2], poles, attachments, anchorSections, junctions };
}

export function init(): {services: Services, store: Store} {
    const svgDrawer = new SVGDrawer();
    
    const data = createTestData();
    const uiStore = new UIStore();
    const counterStore = new CounterStore();
    const polesStore = new PolesStore(data.poles);
    const tracksStore = new TracksStore(data.tracks);
    const junctionsStore = new JunctionsStore(data.junctions);
    const attachmentsStore = new AttachmentsStore(data.attachments);
    const anchorSectionsStore = new AnchorSectionsStore(data.anchorSections);

    return {
        services: {
            svgDrawer
        },
        store: {
            counterStore,
            uiStore,
            polesStore,
            tracksStore,
            attachmentsStore,
            anchorSectionsStore,
            junctionsStore,
        }
    };
}
