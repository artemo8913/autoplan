import { makeAutoObservable } from "mobx";

import type { DisconnectorControlType, DisconnectorState, Pole, Pos } from "@/shared/types/catenaryTypes";

interface DisconnectorConstructorParams {
    id?: string;
    name: string;
    pole: Pole;
    wireLineId?: string;
    controlType: DisconnectorControlType;
    state: DisconnectorState;
    phaseCount: 1 | 2 | 3;
    yOffset: number;
}

export class Disconnector {
    readonly id: string;
    name: string;
    pole: Pole;
    wireLineId: string | undefined;
    controlType: DisconnectorControlType;
    state: DisconnectorState;
    phaseCount: 1 | 2 | 3;
    yOffset: number;

    constructor(params: DisconnectorConstructorParams) {
        this.id = params.id ?? crypto.randomUUID();
        this.name = params.name;
        this.pole = params.pole;
        this.wireLineId = params.wireLineId;
        this.controlType = params.controlType;
        this.state = params.state;
        this.phaseCount = params.phaseCount;
        this.yOffset = params.yOffset;
        makeAutoObservable(this, { id: false, pole: false });
    }

    get pos(): Pos {
        return {
            x: this.pole.pos.x,
            y: this.pole.pos.y + this.yOffset,
        };
    }

    setName(name: string): void {
        this.name = name;
    }

    setState(state: DisconnectorState): void {
        this.state = state;
    }

    setControlType(controlType: DisconnectorControlType): void {
        this.controlType = controlType;
    }

    setPhaseCount(phaseCount: 1 | 2 | 3): void {
        this.phaseCount = phaseCount;
    }

    setYOffset(yOffset: number): void {
        this.yOffset = yOffset;
    }

    setWireLineId(wireLineId: string | undefined): void {
        this.wireLineId = wireLineId;
    }
}
