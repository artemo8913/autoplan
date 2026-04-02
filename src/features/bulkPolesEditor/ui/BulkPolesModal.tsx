import React, { useCallback, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import {
    ActionIcon,
    Alert,
    Button,
    Group,
    Modal,
    ScrollArea,
    Select,
    Table,
    Text,
    TextInput,
    Tooltip,
} from "@mantine/core";

import { RelativeSidePosition } from "@/shared/types/catenaryTypes";
import { useStore } from "@/app";
import { useServices } from "@/app";

import { downloadBulkPolesTemplate, parseXlsxFile, validateRows } from "../lib/xlsxUtils";
import type { BulkPoleRow, RowValidationError } from "../lib/types";

const SIDE_OPTIONS = [
    { value: String(RelativeSidePosition.LEFT),  label: "Л" },
    { value: String(RelativeSidePosition.RIGHT), label: "П" },
];

const DeleteRowIcon: React.FC = () => (
    <svg viewBox="0 0 14 14" width={12} height={12} stroke="currentColor" strokeWidth={2} fill="none">
        <line x1={2} y1={2} x2={12} y2={12} />
        <line x1={12} y1={2} x2={2} y2={12} />
    </svg>
);

function BulkPolesModalComponent() {
    const { uiPanelsStore, tracksStore } = useStore();
    const { entityService } = useServices();

    const [rows, setRows] = useState<BulkPoleRow[]>([]);
    const [validationErrors, setValidationErrors] = useState<RowValidationError[]>([]);
    const [importError, setImportError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const trackList = tracksStore.list;
    const trackOptions = trackList.map((t) => ({ value: t.id, label: t.name }));
    const knownTrackIds = new Set(trackList.map((t) => t.id));

    const handleClose = useCallback(() => {
        setRows([]);
        setValidationErrors([]);
        setImportError(null);
        uiPanelsStore.closeBulkPolesModal();
    }, [uiPanelsStore]);

    const handleAddRow = useCallback(() => {
        setRows((prev) => [
            ...prev,
            {
                rowKey: crypto.randomUUID(),
                name: "",
                x: "",
                trackId: trackList[0]?.id ?? "",
                gabarit: "5.7",
                side: RelativeSidePosition.LEFT,
            },
        ]);
    }, [trackList]);

    const handleDeleteRow = useCallback((rowKey: string) => {
        setRows((prev) => prev.filter((r) => r.rowKey !== rowKey));
        setValidationErrors([]);
    }, []);

    const updateRow = useCallback((rowKey: string, patch: Partial<BulkPoleRow>) => {
        setRows((prev) => prev.map((r) => (r.rowKey === rowKey ? { ...r, ...patch } : r)));
        setValidationErrors([]);
    }, []);

    const handleTemplateDownload = useCallback(() => {
        downloadBulkPolesTemplate(trackList);
    }, [trackList]);

    const handleImportClick = () => fileInputRef.current?.click();

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const buffer = ev.target?.result as ArrayBuffer;
                const result = parseXlsxFile(buffer, knownTrackIds);
                if (!result.ok) {
                    setImportError(result.message);
                } else {
                    setImportError(null);
                    setRows(result.rows);
                    setValidationErrors([]);
                }
            };
            reader.readAsArrayBuffer(file);
            e.target.value = "";
        },
        [knownTrackIds],
    );

    const handleApply = useCallback(() => {
        const { valid, errors } = validateRows(rows, knownTrackIds);
        if (errors.length > 0) {
            setValidationErrors(errors);
            return;
        }
        entityService.bulkCreateCatenaryPoles(valid);
        handleClose();
    }, [rows, knownTrackIds, entityService, handleClose]);

    const getError = (rowIndex: number, field: RowValidationError["field"]) =>
        validationErrors.find((e) => e.rowIndex === rowIndex && e.field === field)?.message;

    return (
        <Modal
            opened={uiPanelsStore.isBulkPolesModalOpen}
            onClose={handleClose}
            title="Массовое добавление опор КС"
            size="xl"
            centered
            scrollAreaComponent={ScrollArea.Autosize}
        >
            <Group mb="sm" justify="space-between">
                <Group gap="xs">
                    <Button size="xs" variant="light" onClick={handleTemplateDownload}>
                        Скачать шаблон XLSX
                    </Button>
                    <Button size="xs" variant="light" onClick={handleImportClick}>
                        Импорт XLSX
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                    />
                </Group>
                <Button size="xs" onClick={handleAddRow}>
                    + Добавить строку
                </Button>
            </Group>

            {importError && (
                <Alert color="red" mb="sm" withCloseButton onClose={() => setImportError(null)}>
                    {importError}
                </Alert>
            )}

            {validationErrors.length > 0 && (
                <Alert color="orange" mb="sm">
                    Исправьте ошибки в таблице перед применением.
                </Alert>
            )}

            <Table withTableBorder withColumnBorders>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th w={36}>№</Table.Th>
                        <Table.Th>Название</Table.Th>
                        <Table.Th w={100}>X (м)</Table.Th>
                        <Table.Th>Путь</Table.Th>
                        <Table.Th w={120}>Габарит (м)</Table.Th>
                        <Table.Th w={90}>Сторона</Table.Th>
                        <Table.Th w={36}></Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rows.length === 0 && (
                        <Table.Tr>
                            <Table.Td colSpan={7}>
                                <Text c="dimmed" ta="center" size="sm" py="md">
                                    Нет строк. Добавьте строки вручную или импортируйте из XLSX.
                                </Text>
                            </Table.Td>
                        </Table.Tr>
                    )}
                    {rows.map((row, idx) => (
                        <Table.Tr key={row.rowKey}>
                            <Table.Td>{idx + 1}</Table.Td>
                            <Table.Td>
                                <TextInput
                                    size="xs"
                                    value={row.name}
                                    error={getError(idx, "name")}
                                    onChange={(e) => updateRow(row.rowKey, { name: e.target.value })}
                                />
                            </Table.Td>
                            <Table.Td>
                                <TextInput
                                    size="xs"
                                    value={row.x}
                                    error={getError(idx, "x")}
                                    onChange={(e) => updateRow(row.rowKey, { x: e.target.value })}
                                />
                            </Table.Td>
                            <Table.Td>
                                <Select
                                    size="xs"
                                    data={trackOptions}
                                    value={row.trackId || null}
                                    error={getError(idx, "trackId")}
                                    onChange={(val) => updateRow(row.rowKey, { trackId: val ?? "" })}
                                    placeholder="Выберите путь"
                                    searchable
                                />
                            </Table.Td>
                            <Table.Td>
                                <TextInput
                                    size="xs"
                                    value={row.gabarit}
                                    error={getError(idx, "gabarit")}
                                    onChange={(e) => updateRow(row.rowKey, { gabarit: e.target.value })}
                                />
                            </Table.Td>
                            <Table.Td>
                                <Select
                                    size="xs"
                                    data={SIDE_OPTIONS}
                                    value={row.side !== null ? String(row.side) : null}
                                    error={getError(idx, "side")}
                                    onChange={(val) =>
                                        updateRow(row.rowKey, {
                                            side: val !== null ? (Number(val) as RelativeSidePosition) : null,
                                        })
                                    }
                                    placeholder="Л/П"
                                />
                            </Table.Td>
                            <Table.Td>
                                <Tooltip label="Удалить строку" position="left" withArrow>
                                    <ActionIcon
                                        variant="subtle"
                                        color="red"
                                        size={24}
                                        onClick={() => handleDeleteRow(row.rowKey)}
                                        aria-label="Удалить строку"
                                    >
                                        <DeleteRowIcon />
                                    </ActionIcon>
                                </Tooltip>
                            </Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>

            <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={handleClose}>
                    Отмена
                </Button>
                <Button onClick={handleApply} disabled={rows.length === 0}>
                    Применить
                </Button>
            </Group>
        </Modal>
    );
}

export const BulkPolesModal = observer(BulkPolesModalComponent);
