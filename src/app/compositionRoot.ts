
import { SVGDrawer } from "@/shared/utils/SVGDrawer";
import { CatenaryType, RelativeSidePosition } from "@/shared/types";
import { Pole } from "@/entities/lib/Pole";
import { Track } from "@/entities/lib/Track";
import { Railway } from "@/entities/lib/Railway";
import { CounterStore } from "@/entities/counter";
import { Attachment } from "@/entities/lib/Attachment";
import { AnchorSection } from "@/entities/lib/AnchorSection";

import type { Store } from "./store";
import type { Services } from "./services";
import { ProjectStore } from "./store/model/projectStore";

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

    const poles: Pole[] = [
        ...new Array(20).fill(null).map((_, i) => new Pole({
            x: 100 * i,
            name: `${2 * (i + 1)}`,
            tracks: {
                [track2.id]: {
                    gabarit: 3.1,
                    relativePositionToTrack: RelativeSidePosition.RIGHT,
                    track: track2
                }
            }
        })),
        ...new Array(20).fill(null).map((_, i) => new Pole({
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
        })),
    ];

    const attachments: Attachment[] = poles.map(pole => {
        const firstTrackRelation = Object.values(pole.tracks)[0];
        return new Attachment(pole, firstTrackRelation.track);
    });

    poles[0].setAnchorGuy({ direction: RelativeSidePosition.LEFT, type: "double" });
    poles[10].setAnchorGuy({ direction: RelativeSidePosition.LEFT, type: "double" });
    poles[14].setAnchorGuy({ direction: RelativeSidePosition.RIGHT, type: "double" });
    poles[19].setAnchorGuy({ direction: RelativeSidePosition.RIGHT, type: "single" });
    poles[20].setAnchorBrace({ direction: RelativeSidePosition.RIGHT });
    poles[20].setAnchorGuy({ direction: RelativeSidePosition.LEFT, type: "single" });
    poles[39].setAnchorGuy({ direction: RelativeSidePosition.RIGHT, type: "single" });

    const anchorSections: AnchorSection[] = [
        new AnchorSection({
            startPole: poles[0],
            endPole: poles[14],
            attachments: attachments.slice(0, 15),
            type: CatenaryType.CS140
        }),
        new AnchorSection({
            startPole: poles[10],
            endPole: poles[19],
            attachments: attachments.slice(10, 20),
            type: CatenaryType.CS140
        }),
        new AnchorSection({
            startPole: poles[20],
            endPole: poles[39],
            attachments: attachments.slice(20),
            type: CatenaryType.CS140
        })
    ];

    return { railway, tracks: [track1, track2], poles, attachments, anchorSections };
}

export function init(): {services: Services, store: Store} {
    const svgDrawer = new SVGDrawer();
    const counterStore = new CounterStore();
    const projectStore = new ProjectStore(createTestData());

    return {
        services: { svgDrawer },
        store: { counterStore, projectStore }
    };
}
