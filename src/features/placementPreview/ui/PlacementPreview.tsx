import React from "react";
import { observer } from "mobx-react-lite";

import { PolePlacementPreview } from "./PolePlacementPreview";
import { CrossSpanPlacementPreview } from "./CrossSpanPlacementPreview";

export const PlacementPreview: React.FC = observer(() => {
    return (
        <>
            <PolePlacementPreview />
            <CrossSpanPlacementPreview />
        </>
    );
});

PlacementPreview.displayName = "PlacementPreview";
