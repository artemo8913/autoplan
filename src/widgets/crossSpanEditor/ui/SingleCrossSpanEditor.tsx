import { useCallback } from "react";
import { observer } from "mobx-react-lite";
import { Autocomplete, Divider, NumberInput, SegmentedControl, Stack, Text } from "@mantine/core";

import type { CrossSpanType } from "@/shared/types/catenaryTypes";
import type { CrossSpan } from "@/entities/catenaryPlanGraphic";
import { crossSpanLabel } from "@/entities/catenaryPlanGraphic";
import { SidePanel } from "@/shared/ui/SidePanel";
import { formatOrdinateCompact } from "@/shared/lib/measure";
import { useServices, useStore } from "@/app";

import { markFieldLabel, markSuggestions } from "../lib/crossSpanMarks";
import { LOAD_INPUT_STEP, SPAN_TYPE_DATA } from "./constants";

interface SingleCrossSpanEditorProps {
    crossSpan: CrossSpan;
    onClose: () => void;
}

export const SingleCrossSpanEditor = observer(({ crossSpan, onClose }: SingleCrossSpanEditorProps) => {
    const { tracksStore } = useStore();
    const { crossSpanService } = useServices();

    const handleTypeChange = useCallback(
        (value: string) => crossSpanService.setSpanType(crossSpan, value as CrossSpanType),
        [crossSpanService, crossSpan],
    );

    const handleMarkChange = useCallback(
        (value: string) => crossSpanService.setMark(crossSpan, value),
        [crossSpanService, crossSpan],
    );

    const handleLoadChange = useCallback(
        (value: string | number) => {
            const parsed = typeof value === "number" ? value : parseFloat(value);
            crossSpanService.setLoadKn(crossSpan, Number.isNaN(parsed) ? undefined : parsed);
        },
        [crossSpanService, crossSpan],
    );

    const picketage = tracksStore.railway.picketage;
    const midX = (crossSpan.poleA.x + crossSpan.poleB.x) / 2;

    return (
        <SidePanel title={crossSpanLabel(crossSpan)} onClose={onClose} width={280}>
            <Stack gap="sm">
                <Stack gap={4}>
                    <Text size="xs">Тип</Text>
                    <SegmentedControl
                        size="xs"
                        fullWidth
                        value={crossSpan.spanType}
                        data={SPAN_TYPE_DATA}
                        onChange={handleTypeChange}
                    />
                </Stack>

                <Stack gap={2}>
                    <Text size="xs" c="dimmed">
                        Опоры: №{crossSpan.poleA.name} и №{crossSpan.poleB.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                        Положение: {formatOrdinateCompact(midX, picketage)}
                    </Text>
                    <Text size="xs" c="dimmed">
                        Длина: {crossSpan.length.toFixed(1)} м
                    </Text>
                </Stack>

                <Divider />

                <Autocomplete
                    size="xs"
                    label={markFieldLabel(crossSpan.spanType)}
                    placeholder="не задана"
                    value={crossSpan.mark ?? ""}
                    data={markSuggestions(crossSpan.spanType)}
                    onChange={handleMarkChange}
                />

                <NumberInput
                    size="xs"
                    label="Расчётная нагрузка, кН"
                    placeholder="не задана"
                    value={crossSpan.loadKn ?? ""}
                    step={LOAD_INPUT_STEP}
                    min={0}
                    decimalScale={2}
                    onChange={handleLoadChange}
                />
            </Stack>
        </SidePanel>
    );
});

SingleCrossSpanEditor.displayName = "SingleCrossSpanEditor";
