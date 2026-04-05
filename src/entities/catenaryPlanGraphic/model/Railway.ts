import { action, makeObservable, observable } from "mobx";

import type { Pos } from "@/shared/types/catenaryTypes";

interface RailwayConstructorParams {
    name: string;
    startX: number;
    endX: number;
}

export class Railway {
    readonly id: string;
    name: string;
    startX: number;
    endX: number;

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

    constructor(params: RailwayConstructorParams) {
        this.id = crypto.randomUUID();
        this.name = params.name;
        this.startX = params.startX;
        this.endX = params.endX;

        makeObservable(this, {
            name: observable,
            startX: observable,
            endX: observable,
            setName: action,
            setStartX: action,
            setEndX: action,
        });
    }
}
