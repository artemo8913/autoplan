import type { Poses } from "@/shared/types";

interface RailwayConstructorParams{
    name: string;

    startX: number;
    endX: number;
}

export class Railway {
    id: string;
    name: string;
    
    startX: number;
    endX: number;

    globalPoses: Poses;
    
    private _generateLinearRailway(){
        for(let i = this.startX; i <= this.endX; i++){
            this.globalPoses[i] = {x: i, y: 0};
        }
    }
        
    constructor(params: RailwayConstructorParams){
        this.id = crypto.randomUUID();
        this.name = params.name;
        this.startX = params.startX;
        this.endX = params.endX;

        this.globalPoses = {};
        this._generateLinearRailway();
    }
}