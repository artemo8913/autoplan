import { action, computed, makeObservable, observable } from "mobx";

import type { RelativeSidePosition } from "@/shared/types/catenaryTypes";
import type { AnchorGuyType, GroundingType, Pole, PoleMaterial } from "@/shared/types/catenaryTypes";
import { CATENARY_POLE_RADIUS } from "@/shared/constants";

import { bindingGabarit, bindingPoleY, offsetFromY, offsetWithGabarit, type TrackBinding } from "../lib/trackBinding";
import type { Track } from "./Track";

interface AnchorGuy {
    type: AnchorGuyType;
    direction: RelativeSidePosition;
}

interface AnchorBrace {
    direction: RelativeSidePosition;
}

export type { TrackBinding };

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
     * смещений по остальным путям. Инвариант: либо undefined при пустых привязках,
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

    /** Габарит по главному пути, м (>= 0) — то, что показывают человеку. */
    get primaryGabarit(): number {
        const primary = this.primaryBinding;
        return primary ? bindingGabarit(primary) : 0;
    }

    getBinding(trackId: string | undefined): TrackBinding | undefined {
        return trackId === undefined ? undefined : this.trackBindings.find((b) => b.track.id === trackId);
    }

    hasTrack(trackId: string): boolean {
        return this.getBinding(trackId) !== undefined;
    }

    /**
     * Пересчитать смещения по всем путям кроме excludeTrackId,
     * исходя из того, что опора находится в poleY.
     */
    private _recalcOtherOffsets(excludeTrackId: string, poleY: number): void {
        this.trackBindings = this.trackBindings.map((binding) =>
            binding.track.id === excludeTrackId
                ? binding
                : { ...binding, offsetMeters: offsetFromY(poleY, binding.track.getPositionAtX(this.x).y) },
        );
    }

    get pos() {
        const primary = this.primaryBinding;
        return {
            x: this.x,
            y: primary ? bindingPoleY(primary, this.x) : 0,
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

    /** Установить знаковое смещение относительно пути (с пересчётом остальных) */
    setTrackOffset(trackId: string, offsetMeters: number) {
        const binding = this.getBinding(trackId);
        if (!binding) {
            return;
        }
        const updated = { ...binding, offsetMeters };
        this.trackBindings = this.trackBindings.map((b) => (b.track.id === trackId ? updated : b));
        this._recalcOtherOffsets(trackId, bindingPoleY(updated, this.x));
    }

    /** Задать габарит (>= 0) до пути, сохранив сторону — так его вводят в панели. */
    setTrackGabarit(trackId: string, gabarit: number) {
        const binding = this.getBinding(trackId);
        if (!binding) {
            return;
        }
        this.setTrackOffset(trackId, offsetWithGabarit(binding, gabarit));
    }

    /** Перебросить опору на другую сторону пути: габарит тот же, знак противоположный. */
    flipTrackSide(trackId: string) {
        const binding = this.getBinding(trackId);
        if (!binding) {
            return;
        }
        this.setTrackOffset(trackId, -binding.offsetMeters);
    }

    /** Добавить привязку к пути (смещение вычисляется из текущей pos) */
    addTrackBinding(track: Track) {
        if (this.hasTrack(track.id)) {
            return;
        }

        const offsetMeters = offsetFromY(this.pos.y, track.getPositionAtX(this.x).y);

        this.trackBindings = [...this.trackBindings, { track, offsetMeters }];
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
     * Перенести привязку с fromTrackId на toTrack, сохранив смещение и место в списке.
     * Если переносимый путь был главным, главным становится новый.
     */
    replaceTrackBinding(fromTrackId: string, toTrack: Track) {
        const binding = this.getBinding(fromTrackId);
        if (!binding || this.hasTrack(toTrack.id)) {
            return;
        }

        this.trackBindings = this.trackBindings.map((b) =>
            b.track.id === fromTrackId ? { track: toTrack, offsetMeters: b.offsetMeters } : b,
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
            setTrackOffset: action,
            setTrackGabarit: action,
            flipTrackSide: action,
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
