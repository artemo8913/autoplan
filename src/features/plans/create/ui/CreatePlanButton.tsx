import React, { useState } from "react";
import { Button } from "@mantine/core";

import { kmPkMToMeters } from "@/shared/lib/measure";
import { useServices } from "@/app";

import { CreatePlanModal, type CreatePlanCoords } from "./CreatePlanModal";

const DEFAULT_COORDS: CreatePlanCoords = {
    startKm: 0,
    startPk: 0,
    startM: 0,
    endKm: 10,
    endPk: 0,
    endM: 0,
};

export const CreatePlanButton: React.FC = () => {
    const { planService } = useServices();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [coords, setCoords] = useState<CreatePlanCoords>(DEFAULT_COORDS);

    const handleCreate = () => {
        const trimmed = name.trim();

        if (!trimmed) {
            return;
        }

        const startX = kmPkMToMeters(coords.startKm, coords.startPk, coords.startM);
        const endX = kmPkMToMeters(coords.endKm, coords.endPk, coords.endM);

        if (endX <= startX) {
            return;
        }

        planService.createPlan(trimmed, startX, endX);
        setName("");
        setCoords(DEFAULT_COORDS);
        setOpen(false);
    };

    return (
        <>
            <Button onClick={() => setOpen(true)}>+ Новый план</Button>
            <CreatePlanModal
                opened={open}
                name={name}
                coords={coords}
                setName={setName}
                setCoords={setCoords}
                onClose={() => setOpen(false)}
                onCreate={handleCreate}
            />
        </>
    );
};
