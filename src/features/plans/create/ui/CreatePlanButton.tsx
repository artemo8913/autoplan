import React, { useState } from "react";
import { Button } from "@mantine/core";

import { useServices } from "@/app";
import { CreatePlanModal } from "./CreatePlanModal";

export const CreatePlanButton: React.FC = () => {
    const { planService } = useServices();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");

    const handleCreate = () => {
        const trimmed = name.trim();

        if (!trimmed) {
            return;
        }

        planService.createPlan(trimmed);
        setName("");
        setOpen(false);
    };

    return (
        <>
            <Button onClick={() => setOpen(true)}>+ Новый план</Button>
            <CreatePlanModal
                opened={open}
                name={name}
                setName={setName}
                onClose={() => setOpen(false)}
                onCreate={handleCreate}
            />
        </>
    );
};
