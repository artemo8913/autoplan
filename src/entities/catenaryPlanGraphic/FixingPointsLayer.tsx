import { observer } from "mobx-react-lite";

import { useStore } from "@/app/store";

import { FixingPointFigure } from "./FixingPointFigure";

export const FixingPointsLayer = observer(() => {
    const { fixingPointsStore } = useStore();
    return (
        <g className="fixingPointsLayer">
            {fixingPointsStore.list.map(
                fp => <FixingPointFigure key={fp.id} fixingPoint={fp} />
            )}
        </g>
    );
});
