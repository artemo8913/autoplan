import { makeAutoObservable } from "mobx";

import type { Pole, Pos, VlPoleType } from "@/shared/types/catenaryTypes";

export class VlPole implements Pole {
    readonly id: string;
    x: number;
    y: number;
    name: string;
    vlType: VlPoleType;
    radius: number = 20;

    get pos(): Pos {
        return { x: this.x, y: this.y };
    }

    constructor(params: { x: number; y: number; name: string; vlType: VlPoleType }) {
        this.id = crypto.randomUUID();
        this.x = params.x;
        this.y = params.y;
        this.name = params.name;
        this.vlType = params.vlType;
        makeAutoObservable(this);
    }
}
