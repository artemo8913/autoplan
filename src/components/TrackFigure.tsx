import type { FC } from "react";

import type { Track } from "../lib/Track";

type TrackFigureProps = {
    track: Track;
}


export const TrackFigure: FC<TrackFigureProps> = ({track}) => {
    let drawPath = "";

    for (let i = track.startX; i <= track.endX; i++) {
        const pos = track.poses[i];

        if (i === 0) {
            drawPath += "M";
        } else {
            drawPath += "L";
        }

        drawPath += `${pos.x},${pos.y}`;
        drawPath += " ";
    }


    return (
        <path
            d={drawPath}
            fill="none"
            stroke="brown"
            strokeWidth="4"
        />
    );
};