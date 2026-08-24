import type { CatenaryPole } from "@/entities/catenaryPlanGraphic";
import { RelativeSidePosition } from "@/shared/types/catenaryTypes";
import type { AnchorGuyType, GroundingType, PoleMaterial } from "@/shared/types/catenaryTypes";

export interface BulkPoleCommonTrack {
    trackId: string;
    gabarit: number | "mixed";
    direction: RelativeSidePosition | "mixed";
}

export interface BulkPoleValues {
    material: PoleMaterial | "mixed";
    anchorGuyType: AnchorGuyType | "none" | "mixed";
    anchorGuyDirection: RelativeSidePosition | "mixed" | null;
    anchorBrace: boolean | "mixed";
    grounding: GroundingType | "none" | "mixed";
    commonTracks: BulkPoleCommonTrack[];
}

function allEqual<T>(values: T[]): boolean {
    return values.length > 0 && values.every((v) => v === values[0]);
}

export function computeBulkPoleValues(poles: CatenaryPole[]): BulkPoleValues {
    if (poles.length === 0) {
        return {
            material: "concrete",
            anchorGuyType: "none",
            anchorGuyDirection: null,
            anchorBrace: false,
            grounding: "none",
            commonTracks: [],
        };
    }

    const materials = poles.map((p) => p.material);
    const material: PoleMaterial | "mixed" = allEqual(materials) ? materials[0] : "mixed";

    const anchorGuyTypes = poles.map((p) => p.anchorGuy?.type ?? "none");
    const anchorGuyType: AnchorGuyType | "none" | "mixed" = allEqual(anchorGuyTypes) ? anchorGuyTypes[0] : "mixed";

    let anchorGuyDirection: RelativeSidePosition | "mixed" | null = null;
    if (anchorGuyType !== "none" && anchorGuyType !== "mixed") {
        const dirs = poles.map((p) => p.anchorGuy!.direction);
        anchorGuyDirection = allEqual(dirs) ? dirs[0] : "mixed";
    }

    const anchorBraces = poles.map((p) => !!p.anchorBrace);
    const anchorBrace: boolean | "mixed" = allEqual(anchorBraces) ? anchorBraces[0] : "mixed";

    const groundings = poles.map((p) => p.grounding ?? "none");
    const grounding: GroundingType | "none" | "mixed" = allEqual(groundings) ? groundings[0] : "mixed";

    // Пересечение треков: только те, что привязаны ко ВСЕМ опорам
    const trackIdSets = poles.map((p) => new Set(p.trackBindings.map((b) => b.track.id)));
    const firstSet = trackIdSets[0];
    const commonTrackIds = [...firstSet].filter((id) => trackIdSets.every((s) => s.has(id)));

    const commonTracks: BulkPoleCommonTrack[] = commonTrackIds.map((trackId) => {
        const bindings = poles.map((p) => p.getBinding(trackId)!);
        const gabarits = bindings.map((b) => b.gabarit);
        const directions = bindings.map((b) => b.relativePositionToTrack);
        return {
            trackId,
            gabarit: allEqual(gabarits) ? gabarits[0] : "mixed",
            direction: allEqual(directions) ? directions[0] : "mixed",
        };
    });

    return { material, anchorGuyType, anchorGuyDirection, anchorBrace, grounding, commonTracks };
}
