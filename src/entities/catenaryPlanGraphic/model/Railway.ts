import { action, makeObservable, observable } from "mobx";

import type { Picketage, Pos } from "@/shared/types/catenaryTypes";

interface RailwayConstructorParams {
    name: string;
    startX: number;
    endX: number;
    picketage?: Picketage;
}

export class Railway {
    readonly id: string;
    name: string;
    startX: number;
    endX: number;
    /** Пикетаж участка — только рубленые км. Пусто = всё стандартное (перевод линейный). */
    picketage: Picketage;

    getPositionAtX(x: number): Pos {
        return { x, y: 0 };
    }

    setName(name: string): void {
        this.name = name;
    }

    setStartX(value: number): void {
        this.startX = value;
    }

    setEndX(value: number): void {
        this.endX = value;
    }

    setPicketage(value: Picketage): void {
        this.picketage = value;
    }

    constructor(params: RailwayConstructorParams) {
        this.id = crypto.randomUUID();
        this.name = params.name;
        this.startX = params.startX;
        this.endX = params.endX;
        this.picketage = params.picketage ?? [];

        makeObservable(this, {
            name: observable,
            startX: observable,
            endX: observable,
            picketage: observable,
            setName: action,
            setStartX: action,
            setEndX: action,
            setPicketage: action,
        });
    }
}
