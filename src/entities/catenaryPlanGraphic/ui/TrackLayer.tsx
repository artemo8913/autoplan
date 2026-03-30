import type { FC } from "react";
import { observer } from "mobx-react-lite";

import { useStore } from "@/app";

import type { Track } from "../model/Track";

type TrackFigureProps = {
    track: Track;
}

const TrackFigure: FC<TrackFigureProps> = observer(({ track }) => {
    const { displaySettingsStore } = useStore();
    const start = track.getPositionAtX(track.startX);
    const end = track.getPositionAtX(track.endX);

    return (
        <line
            x1={start.x} y1={start.y}
            x2={end.x} y2={end.y}
            stroke="brown"
            strokeWidth={displaySettingsStore.trackStrokeWidth}
        />
    );
});

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
