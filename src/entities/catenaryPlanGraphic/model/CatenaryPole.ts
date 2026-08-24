import { action, computed, makeObservable, observable } from "mobx";

import { RelativeSidePosition } from "@/shared/types/catenaryTypes";
import type { AnchorGuyType, GroundingType, Pole, PoleMaterial } from "@/shared/types/catenaryTypes";
import { CATENARY_POLE_SCALE_Y, CATENARY_POLE_RADIUS } from "@/shared/constants";

import type { Track } from "./Track";

interface AnchorGuy {
    type: AnchorGuyType;
    direction: RelativeSidePosition;
}

interface AnchorBrace {
    direction: RelativeSidePosition;
}

/** Привязка опоры к одному пути: габарит и сторона относительно этого пути. */
export interface TrackBinding {
    track: Track;
    gabarit: number;
    relativePositionToTrack: RelativeSidePosition;
}

interface CatenaryPoleConstructorParams {
    id?: string;
    x: number;
    name: string;
    trackBindings: TrackBinding[];
    /** Главный путь; по умолчанию — первая привязка. */
    primaryTrackId?: string;
    material?: PoleMaterial;
    anchorGuy?: AnchorGuy;
    anchorBrace?: AnchorBrace;
}

export class CatenaryPole implements Pole {
    readonly id: string;
    x: number;
    name: string;
    radius: number = CATENARY_POLE_RADIUS;
    anchorGuy?: AnchorGuy;
    anchorBrace?: AnchorBrace;
    grounding?: GroundingType;
    /** Привязки к путям. Главная — не «первая по порядку», а та, что названа в primaryTrackId. */
    trackBindings: TrackBinding[];
    material: PoleMaterial;
    isInsulatingJunctionAnchor: boolean = false;

    /**
     * Id главного пути. Он задаёт Y опоры и служит точкой отсчёта при пересчёте
     * габаритов по остальным путям. Инвариант: либо undefined при пустых привязках,
     * либо id существующей привязки — поддерживается методами модели.
     */
    private _primaryTrackId?: string;

    /** Главная привязка: по ней считается положение опоры. */
    get primaryBinding(): TrackBinding | undefined {
        return this.getBinding(this._primaryTrackId) ?? this.trackBindings[0];
    }

    /** Главный путь опоры (по нему нумерация, пикетаж и положение). */
    get primaryTrack(): Track | undefined {
        return this.primaryBinding?.track;
    }

    get primaryTrackId(): string | undefined {
        return this.primaryBinding?.track.id;
    }

    /** Габарит по главному пути. */
    get primaryGabarit(): number {
        return this.primaryBinding?.gabarit ?? 0;
    }

    getBinding(trackId: string | undefined): TrackBinding | undefined {
        return trackId === undefined ? undefined : this.trackBindings.find((b) => b.track.id === trackId);
    }

    hasTrack(trackId: string): boolean {
        return this.getBinding(trackId) !== undefined;
    }

    /** Вычислить Y опоры из привязки к конкретному пути */
    private _poleYFromBinding(binding: TrackBinding): number {
        const trackY = binding.track.getPositionAtX(this.x).y;
        const offset = CATENARY_POLE_SCALE_Y * binding.gabarit;
        const multiplier = binding.relativePositionToTrack * binding.track.directionMultiplier;
        return trackY + offset * multiplier;
    }

    /**
     * Пересчитать габариты/стороны для всех путей кроме excludeTrackId,
     * исходя из того, что опора находится в poleY.
     */
    private _recalcOtherGabarits(excludeTrackId: string, poleY: number): void {
        this.trackBindings = this.trackBindings.map((binding) => {
            if (binding.track.id === excludeTrackId) {
                return binding;
            }

            const trackY = binding.track.getPositionAtX(this.x).y;
            const absDelta = Math.abs(poleY - trackY);
            const newGabarit = Math.max(0, absDelta / CATENARY_POLE_SCALE_Y);

            const deltaY = trackY - poleY;
            const svgSign = deltaY < 0 ? 1 : -1;
            const newDirection = (svgSign * binding.track.directionMultiplier) as RelativeSidePosition;

            return {
                ...binding,
                gabarit: Math.round(newGabarit * 10) / 10,
                relativePositionToTrack: newDirection,
            };
        });
    }

    get pos() {
        const primary = this.primaryBinding;
        return {
            x: this.x,
            y: primary ? this._poleYFromBinding(primary) : 0,
        };
    }

    setName(value: string) {
        this.name = value;
    }
    setMaterial(value: "concrete" | "metal") {
        this.material = value;
    }
    setX(value: number) {
        this.x = value;
    }

    /** Назначить главный путь (должен быть среди привязок). */
    setPrimaryTrack(trackId: string) {
        if (!this.hasTrack(trackId)) {
            return;
        }
        this._primaryTrackId = trackId;
    }

    /** Установить габарит для конкретного пути (с пересчётом остальных) */
    setTrackGabarit(trackId: string, value: number) {
        const binding = this.getBinding(trackId);
        if (!binding) {
            return;
        }
        const updated = { ...binding, gabarit: value };
        this.trackBindings = this.trackBindings.map((b) => (b.track.id === trackId ? updated : b));
        this._recalcOtherGabarits(trackId, this._poleYFromBinding(updated));
    }

    /** Изменить сторону опоры относительно пути (с пересчётом остальных) */
    setTrackDirection(trackId: string, direction: RelativeSidePosition) {
        const binding = this.getBinding(trackId);
        if (!binding) {
            return;
        }
        const updated = { ...binding, relativePositionToTrack: direction };
        this.trackBindings = this.trackBindings.map((b) => (b.track.id === trackId ? updated : b));
        this._recalcOtherGabarits(trackId, this._poleYFromBinding(updated));
    }

    /** Добавить привязку к пути (габарит и сторона вычисляются из текущей pos) */
    addTrackBinding(track: Track) {
        if (this.hasTrack(track.id)) {
            return;
        }

        const poleY = this.pos.y;
        const trackY = track.getPositionAtX(this.x).y;
        const absDelta = Math.abs(poleY - trackY);
        const gabarit = Math.max(0, absDelta / CATENARY_POLE_SCALE_Y);
        const deltaY = trackY - poleY;
        const svgSign = deltaY < 0 ? 1 : -1;
        const direction = (svgSign * track.directionMultiplier) as RelativeSidePosition;

        this.trackBindings = [
            ...this.trackBindings,
            {
                track,
                gabarit: Math.round(gabarit * 10) / 10,
                relativePositionToTrack: direction,
            },
        ];
        this._primaryTrackId ??= track.id;
    }

    /** Удалить привязку к пути; если он был главным — главным становится первый оставшийся */
    removeTrackBinding(trackId: string) {
        this.trackBindings = this.trackBindings.filter((b) => b.track.id !== trackId);
        if (this._primaryTrackId === trackId) {
            this._primaryTrackId = this.trackBindings[0]?.track.id;
        }
    }

    /**
     * Перенести привязку с fromTrackId на toTrack, сохранив габарит, сторону и место в списке.
     * Если переносимый путь был главным, главным становится новый.
     */
    replaceTrackBinding(fromTrackId: string, toTrack: Track) {
        const binding = this.getBinding(fromTrackId);
        if (!binding || this.hasTrack(toTrack.id)) {
            return;
        }

        this.trackBindings = this.trackBindings.map((b) =>
            b.track.id === fromTrackId
                ? { track: toTrack, gabarit: b.gabarit, relativePositionToTrack: b.relativePositionToTrack }
                : b,
        );
        if (this._primaryTrackId === fromTrackId) {
            this._primaryTrackId = toTrack.id;
        }
    }

    /** Заменить весь набор привязок (используется для восстановления в undo) */
    setTrackBindings(bindings: TrackBinding[], primaryTrackId?: string) {
        this.trackBindings = bindings;
        this._primaryTrackId = primaryTrackId ?? bindings[0]?.track.id;
    }

    setAnchorGuy(value: AnchorGuy | undefined) {
        this.anchorGuy = value;
    }
    setAnchorBrace(value: AnchorBrace | undefined) {
        this.anchorBrace = value;
    }
    setGrounding(value: GroundingType | undefined) {
        this.grounding = value;
    }
    setIsInsulatingJunctionAnchor(value: boolean) {
        this.isInsulatingJunctionAnchor = value;
    }

    constructor(params: CatenaryPoleConstructorParams) {
        this.id = params.id ?? crypto.randomUUID();
        this.name = params.name;
        this.trackBindings = params.trackBindings;
        this._primaryTrackId = params.primaryTrackId ?? params.trackBindings[0]?.track.id;
        this.x = params.x;
        this.material = params.material ?? "concrete";
        this.anchorGuy = params.anchorGuy;
        this.anchorBrace = params.anchorBrace;

        makeObservable<CatenaryPole, "_primaryTrackId">(this, {
            name: observable,
            x: observable,
            material: observable,
            trackBindings: observable,
            _primaryTrackId: observable,
            radius: observable,
            anchorGuy: observable,
            anchorBrace: observable,
            grounding: observable,
            isInsulatingJunctionAnchor: observable,
            primaryBinding: computed,
            primaryTrack: computed,
            primaryTrackId: computed,
            primaryGabarit: computed,
            pos: computed,
            setName: action,
            setMaterial: action,
            setX: action,
            setPrimaryTrack: action,
            setTrackGabarit: action,
            setTrackDirection: action,
            addTrackBinding: action,
            removeTrackBinding: action,
            replaceTrackBinding: action,
            setTrackBindings: action,
            setAnchorGuy: action,
            setAnchorBrace: action,
            setGrounding: action,
            setIsInsulatingJunctionAnchor: action,
        });
    }
}
