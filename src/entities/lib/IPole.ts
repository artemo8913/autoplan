import type { Pos } from "@/shared/types";

export interface IPole {
    readonly id: string;
    x: number;       // нужен напрямую (ZigzagLayer обращается к fp.pole.x)
    name: string;
    radius: number;
    readonly pos: Pos;
}
