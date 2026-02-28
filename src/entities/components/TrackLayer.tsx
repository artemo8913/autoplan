import type { FC } from "react";

import type { Track } from "../lib/Track";
import { TrackFigure } from "./TrackFigure";

type TrackLayerProps = {
    tracks: Track[]
}


export const TrackLayer: FC<TrackLayerProps> = (props) => {
    return (
        <g className="trackLayer">
            {props.tracks.map((track) => <TrackFigure key={track.id} track={track} />)}
        </g>
    );
};