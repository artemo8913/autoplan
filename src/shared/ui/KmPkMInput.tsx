import React from "react";
import { Group, NumberInput, Text } from "@mantine/core";

interface KmPkMInputProps {
    label: string;
    km: number;
    pk: number;
    m: number;
    onKmChange: (value: number) => void;
    onPkChange: (value: number) => void;
    onMChange: (value: number) => void;
    /** Верхняя граница ПК (по умолчанию 9; для рубленого км = число пикетов − 1). */
    maxPk?: number;
    /** Верхняя граница метров внутри пикета (по умолчанию 99; для рубленого пикета = длина − 1). */
    maxM?: number;
}

export const KmPkMInput: React.FC<KmPkMInputProps> = ({
    label,
    km,
    pk,
    m,
    onKmChange,
    onPkChange,
    onMChange,
    maxPk = 9,
    maxM = 99,
}) => {
    const handleChange = (setter: (v: number) => void) => (value: string | number) => {
        const v = typeof value === "number" ? value : parseFloat(value);
        if (!isNaN(v)) {
            setter(v);
        }
    };

    return (
        <div>
            <Text size="xs" fw={500} mb={2}>
                {label}
            </Text>
            <Group grow gap={4}>
                <NumberInput size="xs" label="км" value={km} onChange={handleChange(onKmChange)} min={0} step={1} />
                <NumberInput size="xs" label="пк" value={pk} onChange={handleChange(onPkChange)} min={0} max={maxPk} step={1} />
                <NumberInput size="xs" label="м" value={m} onChange={handleChange(onMChange)} min={0} max={maxM} step={1} />
            </Group>
        </div>
    );
};
