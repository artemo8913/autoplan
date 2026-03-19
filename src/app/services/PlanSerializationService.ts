import type { GroundingType, Pole } from "@/shared/types/catenaryTypes";
import type { PlanDTO, PlanMeta } from "@/shared/types/planTypes";
import {
    AnchorSection,
    CatenaryPole,
    FixingPoint,
    Junction,
    Railway,
    Track,
    VlPole,
    WireLine,
    type PoleToTracksRelations,
} from "@/entities/catenaryPlanGraphic";

import type { PlanEntityStores } from "../types";

export class PlanSerializationService {
    toDTO(meta: PlanMeta, stores: PlanEntityStores): PlanDTO {
        const railway = stores.tracksStore.railway;

        return {
            ...meta,
            railway: {
                name: railway.name,
                startX: railway.startX,
                endX: railway.endX,
            },
            tracks: stores.tracksStore.list.map((t) => ({
                id: t.id,
                name: t.name,
                startX: t.startX,
                endX: t.endX,
                yOffsetMeters: t.yOffsetMeters,
            })),
            catenaryPoles: stores.polesStore.list.map((p) => ({
                id: p.id,
                x: p.x,
                name: p.name,
                radius: p.radius,
                material: p.material,
                isInsulatingJunctionAnchor: p.isInsulatingJunctionAnchor,
                grounding: p.grounding,
                anchorGuy: p.anchorGuy,
                anchorBrace: p.anchorBrace,
                trackBindings: Object.entries(p.tracks).map(([trackId, rel]) => ({
                    trackId,
                    gabarit: rel.gabarit,
                    relativePositionToTrack: rel.relativePositionToTrack,
                })),
            })),
            vlPoles: stores.vlPolesStore.list.map((p) => ({
                id: p.id,
                x: p.x,
                y: p.y,
                name: p.name,
                vlType: p.vlType,
            })),
            fixingPoints: stores.fixingPointsStore.list.map((fp) => ({
                id: fp.id,
                poleId: fp.pole.id,
                trackId: fp.track?.id,
                yOffset: fp.yOffset,
                zigzagValue: fp.zigzagValue,
            })),
            anchorSections: stores.anchorSectionsStore.list.map((s) => ({
                id: s.id,
                type: s.type,
                startPoleId: s.startPole.id,
                endPoleId: s.endPole.id,
                fixingPointIds: s.fixingPoints.map((fp) => fp.id),
            })),
            junctions: stores.junctionsStore.list.map((j) => ({
                id: j.id,
                type: j.type,
                section1Id: j.section1.id,
                section2Id: j.section2.id,
            })),
            wireLines: stores.wireLinesStore.list.map((wl) => ({
                id: wl.id,
                wireType: wl.wireType,
                label: wl.label,
                fixingPointIds: wl.fixingPoints.map((fp) => fp.id),
            })),
        };
    }

    fromDTO(dto: PlanDTO, stores: PlanEntityStores): void {
        // 1. Railway
        const railway = new Railway({
            name: dto.railway.name,
            startX: dto.railway.startX,
            endX: dto.railway.endX,
        });

        // 2. Tracks
        const tracksById = new Map<string, Track>();
        const tracks = dto.tracks.map((d) => {
            const track = new Track({
                id: d.id,
                railway,
                name: d.name,
                startX: d.startX,
                endX: d.endX,
                yOffsetMeters: d.yOffsetMeters,
            });
            tracksById.set(track.id, track);
            return track;
        });

        // 3. CatenaryPoles (resolve track bindings)
        const catenaryPolesById = new Map<string, CatenaryPole>();
        const allPolesById = new Map<string, Pole>();

        const catenaryPoles = dto.catenaryPoles.map((d) => {
            const trackBindings: PoleToTracksRelations = {};

            for (const b of d.trackBindings) {
                const track = tracksById.get(b.trackId);
                if (track) {
                    trackBindings[b.trackId] = {
                        track,
                        gabarit: b.gabarit,
                        relativePositionToTrack: b.relativePositionToTrack,
                    };
                }
            }
            const pole = new CatenaryPole({
                id: d.id,
                x: d.x,
                name: d.name,
                material: d.material,
                tracks: trackBindings,
            });
            pole.setGrounding(d.grounding as GroundingType | undefined);
            if (d.anchorGuy) {
                pole.setAnchorGuy(d.anchorGuy);
            }
            if (d.anchorBrace) {
                pole.setAnchorBrace(d.anchorBrace);
            }
            if (d.isInsulatingJunctionAnchor) {
                pole.setIsInsulatingJunctionAnchor(true);
            }
            catenaryPolesById.set(pole.id, pole);
            allPolesById.set(pole.id, pole);
            return pole;
        });

        // 4. VlPoles
        const vlPoles = dto.vlPoles.map((d) => {
            const vp = new VlPole({ id: d.id, x: d.x, y: d.y, name: d.name, vlType: d.vlType });
            allPolesById.set(vp.id, vp);
            return vp;
        });

        // 5. FixingPoints (resolve pole + track refs)
        const fpById = new Map<string, FixingPoint>();
        const fixingPoints = dto.fixingPoints.map((d) => {
            const pole = allPolesById.get(d.poleId)!;
            const track = d.trackId ? tracksById.get(d.trackId) : undefined;
            const fp = new FixingPoint({ id: d.id, pole, track, yOffset: d.yOffset, zigzagValue: d.zigzagValue });
            fpById.set(fp.id, fp);
            return fp;
        });

        // 6. AnchorSections
        const sectionsById = new Map<string, AnchorSection>();
        const anchorSections = dto.anchorSections.map((d) => {
            const startPole = catenaryPolesById.get(d.startPoleId)!;
            const endPole = catenaryPolesById.get(d.endPoleId)!;
            const fps = d.fixingPointIds.map((id) => fpById.get(id)!);
            const section = new AnchorSection({ id: d.id, startPole, endPole, fixingPoints: fps, type: d.type });
            sectionsById.set(section.id, section);
            return section;
        });

        // 7. Junctions
        const junctions = dto.junctions.map((d) => {
            const section1 = sectionsById.get(d.section1Id)!;
            const section2 = sectionsById.get(d.section2Id)!;
            return new Junction({ id: d.id, section1, section2, type: d.type });
        });

        // 8. WireLines
        const wireLines = dto.wireLines.map((d) => {
            const fps = d.fixingPointIds.map((id) => fpById.get(id)!);
            return new WireLine({ id: d.id, wireType: d.wireType, label: d.label, fixingPoints: fps });
        });

        // 9. Load into stores
        stores.tracksStore.loadFrom(tracks, railway);
        stores.polesStore.loadFrom(catenaryPoles);
        stores.vlPolesStore.loadFrom(vlPoles);
        stores.fixingPointsStore.loadFrom(fixingPoints);
        stores.anchorSectionsStore.loadFrom(anchorSections);
        stores.junctionsStore.loadFrom(junctions);
        stores.wireLinesStore.loadFrom(wireLines);
        stores.crossSpansStore.loadFrom([]);
    }

    createEmptyDTO(name: string): PlanDTO {
        const now = new Date().toISOString();
        return {
            id: "", // будет заменено в AppStore.createPlan
            name,
            createdAt: now,
            updatedAt: now,
            railway: { name, startX: 0, endX: 10000 },
            tracks: [],
            catenaryPoles: [],
            vlPoles: [],
            fixingPoints: [],
            anchorSections: [],
            junctions: [],
            wireLines: [],
        };
    }
}
