//TYPES
import type { Services, Store } from "./types";
//STORE
import { PolesStore } from "./store/PolesStore";
import { TracksStore } from "./store/TracksStore";
import { FixingPointsStore } from "./store/FixingPointsStore";
import { AnchorSectionsStore } from "./store/AnchorSectionsStore";
import { JunctionsStore } from "./store/JunctionsStore";
import { VlPolesStore } from "./store/VlPolesStore";
import { WireLinesStore } from "./store/WireLinesStore";
import { CrossSpansStore } from "./store/CrossSpansStore";
import { UIStore } from "./store/UIStore";

//SERVICE
import { SVGDrawer } from "./services/SvgDrawer";
import { InputHandler, type EntityOperations } from "./services/InputHandler";
import { HitTestService } from "./services/HitTestService";
import { SnapService } from "./services/SnapService";
import { MeasureService } from "./services/MeasureService";

//MOCK. Удалить потом
import { createTestData } from "./initMock";
import type { RelativeSidePosition } from "@/shared/types/catenaryTypes";
import { CatenaryPole, VlPole } from "@/entities/catenaryPlanGraphic";


// scaleY из CatenaryPole (10 SVG единиц = 1 метр габарита)
const CATENARY_POLE_SCALE_Y = 10;
const CATENARY_POLE_DEFAULT_RADIUS = 20;

export function init(): { services: Services; store: Store; inputHandler: InputHandler } {
    const svgDrawer = new SVGDrawer();
    const data = createTestData();

    const uiStore = new UIStore();
    const anchorSectionsStore = new AnchorSectionsStore(data.anchorSections);
    const tracksStore = new TracksStore(data.tracks);
    const polesStore = new PolesStore(data.poles);
    const vlPolesStore = new VlPolesStore(data.vlPoles);
    const fixingPointsStore = new FixingPointsStore(data.fixingPoints);
    const wireLinesStore = new WireLinesStore(data.wireLines);
    const junctionsStore = new JunctionsStore(data.junctions);
    const crossSpansStore = new CrossSpansStore([]);

    const hitTestService = new HitTestService({
        polesStore,
        vlPolesStore,
        wireLinesStore,
        fixingPointsStore,
    });
    const measureService = new MeasureService();
    const snapService = new SnapService({ tracksStore }, measureService);


    // TODO: этому коду здесь не место! Отдельный сервис для undo/redo ???
    // ── EntityOperations — адаптер создания/удаления с undo ────────────────
    const entityOps: EntityOperations = {
        createCatenaryPole(pos, config, snap) {
            const trackId = snap?.trackId;
            const track = trackId ? tracksStore.tracks.get(trackId) : null;
            if (!track) return null;

            const trackPos = track.getPositionAtX(pos.x);
            const deltaY = pos.y - trackPos.y;
            const sign = deltaY >= 0 ? 1 : -1;
            const relativePos = (sign * track.directionMultiplier) as RelativeSidePosition;
            const absGaugeSvg = Math.abs(deltaY);
            const gabarit = Math.max(
                0,
                (absGaugeSvg - CATENARY_POLE_DEFAULT_RADIUS) / CATENARY_POLE_SCALE_Y,
            );

            // Нумерация: чётные пути (directionMultiplier=1) → чётные номера (2,4,6...)
            //           нечётные (directionMultiplier=-1) → нечётные номера (1,3,5...)
            const isEven = track.directionMultiplier === 1;
            const sameDirectionCount = polesStore.list.filter(p => {
                const t = Object.values(p.tracks)[0]?.track;
                return t?.directionMultiplier === track.directionMultiplier;
            }).length;
            const autoName = String((isEven ? 2 : 1) + sameDirectionCount * 2);

            const newPole = new CatenaryPole({
                x: pos.x,
                name: autoName,
                material: config.material ?? "concrete",
                tracks: {
                    [track.id]: {
                        track,
                        gabarit: Math.round(gabarit * 10) / 10,
                        relativePositionToTrack: relativePos,
                    },
                },
            });

            uiStore.undoStack.execute({
                description: `Добавлена опора КС №${newPole.name}`,
                execute: () => { polesStore.poles.set(newPole.id, newPole); },
                undo: () => { polesStore.poles.delete(newPole.id); },
            });

            return newPole.id;
        },

        createVlPole(pos, config, _snap) {
            const newPole = new VlPole({
                x: pos.x,
                y: pos.y,
                name: `В${vlPolesStore.list.length + 1}`,
                vlType: config.vlType,
            });

            uiStore.undoStack.execute({
                description: `Добавлена опора ВЛ ${newPole.name}`,
                execute: () => { vlPolesStore.vlPoles.set(newPole.id, newPole); },
                undo: () => { vlPolesStore.vlPoles.delete(newPole.id); },
            });

            return newPole.id;
        },

        deleteEntities(ids) {
            const snapshots: Array<{ store: Map<string, any>; id: string; obj: any }> = [];

            for (const id of ids) {
                if (polesStore.poles.has(id)) {
                    snapshots.push({ store: polesStore.poles, id, obj: polesStore.poles.get(id) });
                } else if (vlPolesStore.vlPoles.has(id)) {
                    snapshots.push({ store: vlPolesStore.vlPoles, id, obj: vlPolesStore.vlPoles.get(id) });
                }
            }

            uiStore.undoStack.execute({
                description: `Удалено объектов: ${snapshots.length}`,
                execute: () => { snapshots.forEach(s => s.store.delete(s.id)); },
                undo: () => { snapshots.forEach(s => s.store.set(s.id, s.obj)); },
            });
        },
    };

    const inputHandler = new InputHandler(uiStore, hitTestService, snapService, entityOps);

    return {
        inputHandler,
        services: {
            svgDrawer,
            snapService,
            inputHandler,
            hitTestService,
            measureService,
        },
        store: {
            uiStore,
            polesStore,
            tracksStore,
            vlPolesStore,
            wireLinesStore,
            junctionsStore,
            crossSpansStore,
            fixingPointsStore,
            anchorSectionsStore,
        }
    };
}
