import type { FC } from "react";

import type { Track } from "@/entities/lib/Track";

type TrackFigureProps = {
    track: Track;
}

export const TrackFigure: FC<TrackFigureProps> = ({ track }) => {
    const start = track.getPositionAtX(track.startX);
    const end = track.getPositionAtX(track.endX);

    return (
        <line
            x1={start.x} y1={start.y}
            x2={end.x} y2={end.y}
            stroke="brown"
            strokeWidth={1}
        />
    );
};
