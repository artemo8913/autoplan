import type { WireType } from "@/shared/types";

import type { FixingPoint } from "./FixingPoint";

export class WireLine {
    readonly id: string;
    wireType: WireType;
    label?: string;
    fixingPoints: FixingPoint[];

    constructor(params: { wireType: WireType; label?: string; fixingPoints: FixingPoint[] }) {
        this.id = crypto.randomUUID();
        this.wireType = params.wireType;
        this.label = params.label;
        this.fixingPoints = params.fixingPoints;
    }
}
