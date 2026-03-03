import type { Pos } from "@/shared/types";

interface RailwayConstructorParams {
    name: string;
    startX: number;
    endX: number;
}

export class Railway {
    readonly id: string;
    readonly name: string;
    readonly startX: number;
    readonly endX: number;

    getPositionAtX(x: number): Pos {
        return { x, y: 0 };
    }

    constructor(params: RailwayConstructorParams) {
        this.id = crypto.randomUUID();
        this.name = params.name;
        this.startX = params.startX;
        this.endX = params.endX;
    }
}
