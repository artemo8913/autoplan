import React, { useCallback } from "react";
import { observer } from "mobx-react-lite";
import { ActionIcon, Button, NumberInput, Stack, Text, TextInput, Tooltip } from "@mantine/core";

import type { Track, Railway } from "@/entities/catenaryPlanGraphic";
import { SidePanel } from "@/shared/ui/SidePanel";
import { KmPkMInput } from "@/shared/ui/KmPkMInput";
import { metersToKmPkM, kmPkMToMeters } from "@/shared/lib/measure";
import { kmPkMLimits } from "@/shared/lib/picketageOps";
import type { Picketage } from "@/shared/types/catenaryTypes";
import { useServices, useStore } from "@/app";

import { PicketageEditor } from "./PicketageEditor";
import styles from "./TracksEditorPanel.module.css";

// -- Константы --

const Y_OFFSET_STEP = 0.5;

// -- RailwaySection --

interface RailwaySectionProps {
    railway: Railway;
}

const RailwaySection: React.FC<RailwaySectionProps> = observer(({ railway }) => {
    const { trackService } = useServices();

    const handleNameChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => trackService.setRailwayName(e.target.value),
        [trackService],
    );

    const { picketage } = railway;
    const start = metersToKmPkM(railway.startX, picketage);
    const end = metersToKmPkM(railway.endX, picketage);

    const handleStartChange = (field: "km" | "pk" | "m") => (value: number) => {
        const newStart = { ...start, [field]: value };
        const newStartX = kmPkMToMeters(newStart.km, newStart.pk, newStart.m, picketage);
        if (newStartX < railway.endX) {
            trackService.setRailwayStartX(newStartX);
        }
    };

    const handleEndChange = (field: "km" | "pk" | "m") => (value: number) => {
        const newEnd = { ...end, [field]: value };
        const newEndX = kmPkMToMeters(newEnd.km, newEnd.pk, newEnd.m, picketage);
        if (newEndX > railway.startX) {
            trackService.setRailwayEndX(newEndX);
        }
    };

    return (
        <Stack gap={4} mb="sm">
            <Text size="sm" fw={600}>
                Участок
            </Text>
            <TextInput size="xs" label="Название" value={railway.name} onChange={handleNameChange} />
            <KmPkMInput
                label="Начало"
                km={start.km}
                pk={start.pk}
                m={start.m}
                onKmChange={handleStartChange("km")}
                onPkChange={handleStartChange("pk")}
                onMChange={handleStartChange("m")}
                {...kmPkMLimits(picketage, start.km, start.pk)}
            />
            <KmPkMInput
                label="Конец"
                km={end.km}
                pk={end.pk}
                m={end.m}
                onKmChange={handleEndChange("km")}
                onPkChange={handleEndChange("pk")}
                onMChange={handleEndChange("m")}
                {...kmPkMLimits(picketage, end.km, end.pk)}
            />
            <PicketageEditor railway={railway} />
        </Stack>
    );
});

// -- TrackRow --

interface TrackRowProps {
    track: Track;
    picketage: Picketage;
    blockReason: string | null;
    onDelete: (track: Track) => void;
}

const TrackRow: React.FC<TrackRowProps> = observer(({ track, picketage, blockReason, onDelete }) => {
    const { trackService } = useServices();

    const handleNameChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => trackService.setTrackName(track, e.target.value),
        [trackService, track],
    );
    const handleYOffsetChange = useCallback(
        (value: string | number) => {
            const v = typeof value === "number" ? value : parseFloat(value);
            if (!isNaN(v)) {
                trackService.setTrackYOffset(track, v);
            }
        },
        [trackService, track],
    );
    const handleDeleteClick = useCallback(() => onDelete(track), [track, onDelete]);

    const startCoords = metersToKmPkM(track.startX, picketage);
    const endCoords = metersToKmPkM(track.endX, picketage);

    const handleStartChange = (field: "km" | "pk" | "m") => (value: number) => {
        const newStart = { ...startCoords, [field]: value };
        const newStartX = kmPkMToMeters(newStart.km, newStart.pk, newStart.m, picketage);
        if (newStartX < track.endX) {
            trackService.setTrackStartX(track, newStartX);
        }
    };

    const handleEndChange = (field: "km" | "pk" | "m") => (value: number) => {
        const newEnd = { ...endCoords, [field]: value };
        const newEndX = kmPkMToMeters(newEnd.km, newEnd.pk, newEnd.m, picketage);
        if (newEndX > track.startX) {
            trackService.setTrackEndX(track, newEndX);
        }
    };

    const sideLabel = track.yOffsetMeters >= 0 ? "чётный" : "нечётный";
    const isBlocked = blockReason !== null;

    return (
        <div className={styles.track}>
            <div className={styles["track__header"]}>
                <TextInput
                    className={styles["track__name"]}
                    size="xs"
                    label="Номер пути"
                    value={track.name}
                    onChange={handleNameChange}
                />
                <Text size="xs" c="dimmed">
                    {sideLabel}
                </Text>
                <Tooltip label={isBlocked ? `Нельзя удалить: ${blockReason}` : "Удалить путь"} withArrow>
                    <ActionIcon variant="subtle" color="red" size="sm" onClick={handleDeleteClick} disabled={isBlocked}>
                        ✕
                    </ActionIcon>
                </Tooltip>
            </div>
            <Stack gap={4}>
                <NumberInput
                    label="Смещение, м"
                    size="xs"
                    step={Y_OFFSET_STEP}
                    value={track.yOffsetMeters}
                    onChange={handleYOffsetChange}
                />
                <KmPkMInput
                    label="Начало"
                    km={startCoords.km}
                    pk={startCoords.pk}
                    m={startCoords.m}
                    onKmChange={handleStartChange("km")}
                    onPkChange={handleStartChange("pk")}
                    onMChange={handleStartChange("m")}
                    {...kmPkMLimits(picketage, startCoords.km, startCoords.pk)}
                />
                <KmPkMInput
                    label="Конец"
                    km={endCoords.km}
                    pk={endCoords.pk}
                    m={endCoords.m}
                    onKmChange={handleEndChange("km")}
                    onPkChange={handleEndChange("pk")}
                    onMChange={handleEndChange("m")}
                    {...kmPkMLimits(picketage, endCoords.km, endCoords.pk)}
                />
            </Stack>
        </div>
    );
});

// -- TracksEditorPanel --

function TracksEditorPanelComponent() {
    const { tracksStore, uiPanelsStore } = useStore();
    const { trackService } = useServices();

    const handleDelete = useCallback((track: Track) => trackService.deleteTrack(track), [trackService]);

    if (!uiPanelsStore.isOpenTracksEditorPanel) {
        return null;
    }

    return (
        <SidePanel
            title="Пути"
            onClose={() => uiPanelsStore.toggleTracksEditorPanel()}
            width={300}
            headerExtra={
                <Button variant="light" size="xs" onClick={() => trackService.createTrack()}>
                    + Добавить путь
                </Button>
            }
        >
            <RailwaySection railway={tracksStore.railway} />
            {tracksStore.list.map((track) => (
                <TrackRow
                    key={track.id}
                    track={track}
                    picketage={tracksStore.railway.picketage}
                    blockReason={trackService.getDeleteBlockReason(track.id)}
                    onDelete={handleDelete}
                />
            ))}
        </SidePanel>
    );
}

export const TracksEditorPanel = observer(TracksEditorPanelComponent);
