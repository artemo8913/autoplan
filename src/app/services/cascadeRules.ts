import type { AnchorSection, FixingPoint, WireLine } from "@/entities/catenaryPlanGraphic";

import type { PlanEntityStores } from "../types";
import type { ReversibleOp } from "../store/UndoStackStore";

/**
 * Единый реестр правил «удалили X → что с Y».
 *
 * Все сервисы удаления обязаны строить свои команды через `planDeletion`:
 * так каскад описан в одном месте, а не размазан по EntityService и панелям.
 *
 * Правила:
 *   опора КС      → ТФ на ней, разъединители на ней, поперечины, опирающиеся на неё;
 *   опора ВЛ      → ТФ на ней;
 *   поперечина    → ТФ, подвешенные к её балке;
 *   АУ            → её ТФ и сопряжения, ссылающиеся на неё;
 *   линия ВЛ      → её ТФ;
 *   ТФ            → снимается из списка родителя (АУ / ВЛ);
 *   путь          → привязки опор к нему, привязки ТФ и primaryTrack у АУ.
 *
 * Всё, что не удаляется, но ссылается на удалённое, «отцепляется» обратимой операцией.
 */

export interface DeletionCounts {
    poles: number;
    vlPoles: number;
    crossSpans: number;
    disconnectors: number;
    fixingPoints: number;
    anchorSections: number;
    wireLines: number;
    junctions: number;
    tracks: number;
}

export interface DeletionPlan {
    /** Операции в порядке применения: сначала отцепление ссылок, затем удаление из сторов. */
    ops: ReversibleOp[];
    counts: DeletionCounts;
}

type IdSets = Record<keyof DeletionCounts, Set<string>>;

function emptyIdSets(): IdSets {
    return {
        poles: new Set(),
        vlPoles: new Set(),
        crossSpans: new Set(),
        disconnectors: new Set(),
        fixingPoints: new Set(),
        anchorSections: new Set(),
        wireLines: new Set(),
        junctions: new Set(),
        tracks: new Set(),
    };
}

/** Разложить произвольные id по типам сущностей. */
function classify(ids: string[], s: PlanEntityStores): IdSets {
    const sets = emptyIdSets();

    for (const id of ids) {
        if (s.catenaryPoleStore.poles.has(id)) {
            sets.poles.add(id);
        } else if (s.vlPolesStore.vlPoles.has(id)) {
            sets.vlPoles.add(id);
        } else if (s.crossSpansStore.crossSpans.has(id)) {
            sets.crossSpans.add(id);
        } else if (s.disconnectorsStore.disconnectors.has(id)) {
            sets.disconnectors.add(id);
        } else if (s.fixingPointsStore.fixingPoints.has(id)) {
            sets.fixingPoints.add(id);
        } else if (s.anchorSectionsStore.anchorSections.has(id)) {
            sets.anchorSections.add(id);
        } else if (s.wireLinesStore.wireLines.has(id)) {
            sets.wireLines.add(id);
        } else if (s.junctionsStore.junctions.has(id)) {
            sets.junctions.add(id);
        } else if (s.tracksStore.tracks.has(id)) {
            sets.tracks.add(id);
        }
    }

    return sets;
}

/** Замыкание правил: дополнить наборы всем, что не переживёт удаление. */
function expand(sets: IdSets, s: PlanEntityStores): void {
    // опора КС → разъединители на ней
    for (const d of s.disconnectorsStore.list) {
        if (sets.poles.has(d.pole.id)) {
            sets.disconnectors.add(d.id);
        }
    }

    // опора КС → поперечины, опирающиеся на неё
    for (const cs of s.crossSpansStore.list) {
        if (sets.poles.has(cs.poleA.id) || sets.poles.has(cs.poleB.id)) {
            sets.crossSpans.add(cs.id);
        }
    }

    // АУ / линия ВЛ → их ТФ
    for (const section of s.anchorSectionsStore.list) {
        if (sets.anchorSections.has(section.id)) {
            section.fixingPoints.forEach((fp) => sets.fixingPoints.add(fp.id));
        }
    }
    for (const wire of s.wireLinesStore.list) {
        if (sets.wireLines.has(wire.id)) {
            wire.fixingPoints.forEach((fp) => sets.fixingPoints.add(fp.id));
        }
    }

    // опора (КС/ВЛ) и поперечина → ТФ, которые на них держатся
    for (const fp of s.fixingPointsStore.list) {
        const supportGone =
            sets.poles.has(fp.pole.id) ||
            sets.vlPoles.has(fp.pole.id) ||
            (!!fp.crossSpan && sets.crossSpans.has(fp.crossSpan.id));

        if (supportGone) {
            sets.fixingPoints.add(fp.id);
        }
    }

    // АУ → сопряжения, ссылающиеся на неё
    for (const j of s.junctionsStore.list) {
        if (sets.anchorSections.has(j.section1.id) || sets.anchorSections.has(j.section2.id)) {
            sets.junctions.add(j.id);
        }
    }
}

/** Отцепить ссылки у АУ, переживающих удаление: список ТФ, граничные опоры, primaryTrack. */
function detachAnchorSectionOps(sets: IdSets, s: PlanEntityStores): ReversibleOp[] {
    const ops: ReversibleOp[] = [];

    for (const section of s.anchorSectionsStore.list) {
        if (sets.anchorSections.has(section.id)) {
            continue;
        }

        const losesFps = section.fixingPoints.some((fp) => sets.fixingPoints.has(fp.id));
        const losesStart = !!section.startPole && sets.poles.has(section.startPole.id);
        const losesEnd = !!section.endPole && sets.poles.has(section.endPole.id);
        const losesTrack = !!section.primaryTrack && sets.tracks.has(section.primaryTrack.id);

        if (!losesFps && !losesStart && !losesEnd && !losesTrack) {
            continue;
        }

        const prevFps = [...section.fixingPoints];
        const prevStart = section.startPole;
        const prevEnd = section.endPole;
        const prevTrack = section.primaryTrack;

        ops.push({
            execute: () => {
                if (losesFps) {
                    section.setFixingPoints(section.fixingPoints.filter((fp) => !sets.fixingPoints.has(fp.id)));
                }
                if (losesStart) {
                    section.setStartPole(undefined);
                }
                if (losesEnd) {
                    section.setEndPole(undefined);
                }
                if (losesTrack) {
                    section.setPrimaryTrack(undefined);
                }
            },
            undo: () => {
                section.setFixingPoints(prevFps);
                section.setStartPole(prevStart);
                section.setEndPole(prevEnd);
                section.setPrimaryTrack(prevTrack);
            },
        });
    }

    return ops;
}

/** Отцепить удаляемые ТФ у переживающих линий ВЛ. */
function detachWireLineOps(sets: IdSets, s: PlanEntityStores): ReversibleOp[] {
    const ops: ReversibleOp[] = [];

    for (const wire of s.wireLinesStore.list) {
        if (sets.wireLines.has(wire.id)) {
            continue;
        }
        if (!wire.fixingPoints.some((fp) => sets.fixingPoints.has(fp.id))) {
            continue;
        }

        const prevFps = [...wire.fixingPoints];
        ops.push({
            execute: () => wire.setFixingPoints(wire.fixingPoints.filter((fp) => !sets.fixingPoints.has(fp.id))),
            undo: () => wire.setFixingPoints(prevFps),
        });
    }

    return ops;
}

/** Отцепить привязки к удаляемым путям: у опор и у переживающих ТФ. */
function detachTrackOps(sets: IdSets, s: PlanEntityStores): ReversibleOp[] {
    if (sets.tracks.size === 0) {
        return [];
    }

    const ops: ReversibleOp[] = [];

    for (const pole of s.catenaryPoleStore.list) {
        if (sets.poles.has(pole.id)) {
            continue;
        }
        const doomed = Object.keys(pole.tracks).filter((trackId) => sets.tracks.has(trackId));
        if (doomed.length === 0) {
            continue;
        }

        const prevTracks = { ...pole.tracks };
        ops.push({
            execute: () => doomed.forEach((trackId) => pole.removeTrackBinding(trackId)),
            undo: () => pole.setTracks(prevTracks),
        });
    }

    for (const fp of s.fixingPointsStore.list) {
        if (sets.fixingPoints.has(fp.id) || !fp.track || !sets.tracks.has(fp.track.id)) {
            continue;
        }

        const prevTrack = fp.track;
        ops.push({
            execute: () => fp.setTrack(undefined),
            undo: () => fp.setTrack(prevTrack),
        });
    }

    return ops;
}

/** Снять удаляемые ТФ со всех родителей и убрать из сторов сами сущности. */
function removeOps(sets: IdSets, s: PlanEntityStores): ReversibleOp[] {
    const ops: ReversibleOp[] = [];

    const removeFrom = <T extends { id: string }>(
        ids: Set<string>,
        map: Map<string, T>,
        add: (entity: T) => void,
        remove: (id: string) => void,
    ) => {
        for (const id of ids) {
            const entity = map.get(id);
            if (!entity) {
                continue;
            }
            ops.push({ execute: () => remove(id), undo: () => add(entity) });
        }
    };

    removeFrom(
        sets.junctions,
        s.junctionsStore.junctions,
        (j) => s.junctionsStore.add(j),
        (id) => s.junctionsStore.remove(id),
    );
    removeFrom(
        sets.fixingPoints,
        s.fixingPointsStore.fixingPoints,
        (fp) => s.fixingPointsStore.add(fp),
        (id) => s.fixingPointsStore.remove(id),
    );
    removeFrom(
        sets.anchorSections,
        s.anchorSectionsStore.anchorSections,
        (section) => s.anchorSectionsStore.add(section),
        (id) => s.anchorSectionsStore.remove(id),
    );
    removeFrom(
        sets.wireLines,
        s.wireLinesStore.wireLines,
        (wire) => s.wireLinesStore.add(wire),
        (id) => s.wireLinesStore.remove(id),
    );
    removeFrom(
        sets.disconnectors,
        s.disconnectorsStore.disconnectors,
        (d) => s.disconnectorsStore.add(d),
        (id) => s.disconnectorsStore.remove(id),
    );
    removeFrom(
        sets.crossSpans,
        s.crossSpansStore.crossSpans,
        (cs) => s.crossSpansStore.add(cs),
        (id) => s.crossSpansStore.remove(id),
    );
    removeFrom(
        sets.vlPoles,
        s.vlPolesStore.vlPoles,
        (p) => s.vlPolesStore.add(p),
        (id) => s.vlPolesStore.remove(id),
    );
    removeFrom(
        sets.poles,
        s.catenaryPoleStore.poles,
        (p) => s.catenaryPoleStore.add(p),
        (id) => s.catenaryPoleStore.remove(id),
    );
    removeFrom(
        sets.tracks,
        s.tracksStore.tracks,
        (t) => s.tracksStore.add(t),
        (id) => s.tracksStore.remove(id),
    );

    return ops;
}

/**
 * Построить полный план удаления по произвольному набору id.
 * Операции не применяются — вызывающий сервис оборачивает их в команду undo-стека.
 */
export function planDeletion(ids: string[], stores: PlanEntityStores): DeletionPlan {
    const sets = classify(ids, stores);
    expand(sets, stores);

    const ops = [
        ...detachAnchorSectionOps(sets, stores),
        ...detachWireLineOps(sets, stores),
        ...detachTrackOps(sets, stores),
        ...removeOps(sets, stores),
    ];

    const counts: DeletionCounts = {
        poles: sets.poles.size,
        vlPoles: sets.vlPoles.size,
        crossSpans: sets.crossSpans.size,
        disconnectors: sets.disconnectors.size,
        fixingPoints: sets.fixingPoints.size,
        anchorSections: sets.anchorSections.size,
        wireLines: sets.wireLines.size,
        junctions: sets.junctions.size,
        tracks: sets.tracks.size,
    };

    return { ops, counts };
}

/** Операции снятия одной ТФ с её родителя (без удаления из стора). */
export function detachFixingPointFromParent(parent: AnchorSection | WireLine, fp: FixingPoint): ReversibleOp {
    const prevFps = [...parent.fixingPoints];
    return {
        execute: () => parent.removeFixingPoint(fp.id),
        undo: () => parent.setFixingPoints(prevFps),
    };
}
