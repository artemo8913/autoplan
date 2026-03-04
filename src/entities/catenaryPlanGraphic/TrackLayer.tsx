import { observer } from "mobx-react-lite";

import { useStore } from "@/app/store";
import { TrackFigure } from "./TrackFigure";

export const TrackLayer = observer(() => {
    const { tracksStore } = useStore();
    return (
        <g className="trackLayer">
            {tracksStore.list.map((track) => (
                <TrackFigure key={track.id} track={track} />
            ))}
        </g>
    );
});
