import type { Pos } from "@/shared/types/catenaryTypes";

interface RailwayConstructorParams {
    name: string;
    startX: number;
    endX: number;
}
//TODO: в DTO тоже хранить railway id, как и в других примерах?
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
