import { useCallback } from "react";
import { observer } from "mobx-react-lite";
import { Autocomplete, Divider, NumberInput, SegmentedControl, Stack, Text } from "@mantine/core";

import type { CrossSpanType } from "@/shared/types/catenaryTypes";
import type { CrossSpan } from "@/entities/catenaryPlanGraphic";
import { SidePanel } from "@/shared/ui/SidePanel";
import { useServices } from "@/app";

import { computeBulkCrossSpanValues } from "../lib/computeBulkCrossSpanValues";
import { markFieldLabel, markSuggestions } from "../lib/crossSpanMarks";
import { LOAD_INPUT_STEP, SPAN_TYPE_DATA } from "./constants";

interface BulkCrossSpanEditorProps {
    crossSpans: CrossSpan[];
    onClose: () => void;
}

export const BulkCrossSpanEditor = observer(({ crossSpans, onClose }: BulkCrossSpanEditorProps) => {
    const { crossSpanService } = useServices();

    const handleTypeChange = useCallback(
        (value: string) => {
            if (value !== "mixed") {
                crossSpanService.setBulkSpanType(crossSpans, value as CrossSpanType);
            }
        },
        [crossSpanService, crossSpans],
    );

    const handleMarkChange = useCallback(
        (value: string) => crossSpanService.setBulkMark(crossSpans, value),
        [crossSpanService, crossSpans],
    );

    const handleLoadChange = useCallback(
        (value: string | number) => {
            const parsed = typeof value === "number" ? value : parseFloat(value);
            crossSpanService.setBulkLoadKn(crossSpans, Number.isNaN(parsed) ? undefined : parsed);
        },
        [crossSpanService, crossSpans],
    );

    const bulk = computeBulkCrossSpanValues(crossSpans);
    /** Тип, общий для всего выделения, или null — «разные». */
    const uniformType = bulk.spanType === "mixed" ? null : bulk.spanType;
    const isMixedType = uniformType === null;
    const isMixedMark = bulk.mark === "mixed";
    const isMixedLoad = bulk.loadKn === "mixed";

    const typeData = [...(isMixedType ? [{ value: "mixed", label: "—", disabled: true }] : []), ...SPAN_TYPE_DATA];

    return (
        <SidePanel title={`Поперечины (${crossSpans.length})`} onClose={onClose} width={280}>
            <Stack gap="sm">
                <Stack gap={4}>
                    <Text size="xs">Тип</Text>
                    <SegmentedControl
                        size="xs"
                        fullWidth
                        value={isMixedType ? "mixed" : bulk.spanType}
                        data={typeData}
                        onChange={handleTypeChange}
                    />
                </Stack>

                <Divider />

                {/* Марка ригеля и марка троса — разные характеристики: при разнотипном
                    выделении общего поля нет, сначала нужно свести тип к одному. */}
                {uniformType === null ? (
                    <Text size="xs" c="dimmed" fs="italic">
                        Марка правится только у поперечин одного типа
                    </Text>
                ) : (
                    <Autocomplete
                        size="xs"
                        label={markFieldLabel(uniformType)}
                        placeholder={isMixedMark ? "разные" : "не задана"}
                        value={isMixedMark ? "" : (bulk.mark ?? "")}
                        data={markSuggestions(uniformType)}
                        onChange={handleMarkChange}
                    />
                )}

                <NumberInput
                    size="xs"
                    label="Расчётная нагрузка, кН"
                    placeholder={isMixedLoad ? "разные" : "не задана"}
                    value={isMixedLoad ? "" : (bulk.loadKn ?? "")}
                    step={LOAD_INPUT_STEP}
                    min={0}
                    decimalScale={2}
                    onChange={handleLoadChange}
                />
            </Stack>
        </SidePanel>
    );
});

BulkCrossSpanEditor.displayName = "BulkCrossSpanEditor";
