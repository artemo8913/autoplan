import React from "react";
import { observer } from "mobx-react-lite";
import { Button, Stack, Text } from "@mantine/core";

import type { Railway } from "@/entities/catenaryPlanGraphic";
import { CollapsibleSection } from "@/shared/ui/CollapsibleSection";
import { metersToKmPkM } from "@/shared/lib/measure";
import { addNonStandardKm } from "@/shared/lib/picketageOps";
import { useServices } from "@/app";

import { NonStandardKmRow } from "./NonStandardKmRow";

interface PicketageEditorProps {
    railway: Railway;
}

export const PicketageEditor: React.FC<PicketageEditorProps> = observer(({ railway }) => {
    const { trackService, notificationService } = useServices();
    const picketage = railway.picketage;
    const startKm = metersToKmPkM(railway.startX, picketage).km;
    const endKm = metersToKmPkM(railway.endX, picketage).km;

    const handleAdd = () => {
        const existing = new Set(picketage.map((e) => e.km));
        let km = startKm;
        while (km <= endKm && existing.has(km)) {
            km++;
        }
        if (km > endKm) {
            notificationService.warning(
                `Свободных км не осталось: все км участка (${startKm}…${endKm}) уже описаны как нестандартные`,
                { key: "picketage-no-free-km" },
            );
            return;
        }
        trackService.setPicketage(addNonStandardKm(picketage, km), `Добавлен нестандартный км ${km}`);
    };

    const sorted = [...picketage].sort((a, b) => a.km - b.km);

    return (
        <CollapsibleSection
            title="Нестандартные км"
            defaultOpen={picketage.length > 0}
            extra={
                <Button variant="light" size="xs" onClick={handleAdd}>
                    + Добавить
                </Button>
            }
        >
            <Stack gap={2}>
                {sorted.length === 0 && (
                    <Text size="xs" c="dimmed" fs="italic">
                        Все км стандартные (10 ПК × 100 м)
                    </Text>
                )}
                {sorted.map((entry) => (
                    <NonStandardKmRow key={entry.km} entry={entry} railway={railway} startKm={startKm} endKm={endKm} />
                ))}
            </Stack>
        </CollapsibleSection>
    );
});

PicketageEditor.displayName = "PicketageEditor";
