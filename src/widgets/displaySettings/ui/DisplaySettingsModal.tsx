import { observer } from "mobx-react-lite";
import { Modal, Button, Group, Stack, Text, Accordion, Slider } from "@mantine/core";

import { useStore, type DisplaySettings } from "@/app";

interface SettingRowProps {
    label: string;
    settingKey: keyof DisplaySettings;
}

const NumberSettingRow: React.FC<SettingRowProps & { min?: number; max?: number; step?: number }> = observer(
    ({ label, settingKey, min = 0, max, step = 1 }) => {
        const { displaySettingsStore } = useStore();
        return (
            <>
                <Text>{label}</Text>
                <Slider
                    value={displaySettingsStore[settingKey] as number}
                    onChange={(val) => {
                        if (typeof val === "number") {
                            displaySettingsStore.set(settingKey, val);
                        }
                    }}
                    min={min}
                    max={max}
                    step={step}
                    size="xs"
                />
            </>
        );
    },
);

interface DisplaySettingsModalProps {
    opened: boolean;
    onClose: () => void;
}

export const DisplaySettingsModal: React.FC<DisplaySettingsModalProps> = observer(({ opened, onClose }) => {
    const { displaySettingsStore } = useStore();

    return (
        <Modal opened={opened} onClose={onClose} title="Настройки отображения" size="md" centered>
            <Stack gap="sm">
                <Accordion variant="separated" multiple defaultValue={["scales"]}>
                    {/* ── Масштабы и размеры ── */}
                    <Accordion.Item value="scales">
                        <Accordion.Control>
                            <Text size="sm" fw={500}>
                                Масштабы и размеры
                            </Text>
                        </Accordion.Control>
                        <Accordion.Panel>
                            <Stack gap="xs">
                                <NumberSettingRow
                                    label="Масштаб Y опоры КС"
                                    settingKey="catenaryPoleScaleY"
                                    min={1}
                                    max={50}
                                />
                                <NumberSettingRow
                                    label="Радиус опоры КС"
                                    settingKey="catenaryPoleRadius"
                                    min={1}
                                    max={100}
                                />
                                <NumberSettingRow
                                    label="Размер опоры ВЛ"
                                    settingKey="vlPoleDefaultSize"
                                    min={1}
                                    max={50}
                                />
                                <NumberSettingRow
                                    label="Толщина базовой линии"
                                    settingKey="baseStroke"
                                    min={0.5}
                                    max={10}
                                    step={0.5}
                                />
                            </Stack>
                        </Accordion.Panel>
                    </Accordion.Item>

                    {/* ── Смещения лейблов ── */}
                    <Accordion.Item value="offsets">
                        <Accordion.Control>
                            <Text size="sm" fw={500}>
                                Смещения подписей
                            </Text>
                        </Accordion.Control>
                        <Accordion.Panel>
                            <Stack gap="xs">
                                <NumberSettingRow
                                    label="Смещение Y подписи опоры"
                                    settingKey="poleLabelYOffset"
                                    min={0}
                                    max={200}
                                />
                                <NumberSettingRow
                                    label="Смещение Y длины пролёта"
                                    settingKey="spanLabelYOffset"
                                    min={0}
                                    max={100}
                                />
                                <NumberSettingRow
                                    label="Смещение X подписи ВЛ"
                                    settingKey="vlPoleLabelXOffset"
                                    min={0}
                                    max={50}
                                />
                                <NumberSettingRow
                                    label="Смещение X текста зигзага"
                                    settingKey="zigzagTextXOffset"
                                    min={0}
                                    max={50}
                                />
                                <NumberSettingRow
                                    label="Множитель Y текста зигзага"
                                    settingKey="zigzagTextYMultiplier"
                                    min={0}
                                    max={20}
                                />
                            </Stack>
                        </Accordion.Panel>
                    </Accordion.Item>

                    {/* ── Ширины линий ── */}
                    <Accordion.Item value="strokes">
                        <Accordion.Control>
                            <Text size="sm" fw={500}>
                                Ширины линий
                            </Text>
                        </Accordion.Control>
                        <Accordion.Panel>
                            <Stack gap="xs">
                                <NumberSettingRow
                                    label="Подвеска КС"
                                    settingKey="catenaryStrokeWidth"
                                    min={0.5}
                                    max={20}
                                    step={0.5}
                                />
                                <NumberSettingRow
                                    label="Консоль"
                                    settingKey="fixingPointStrokeWidth"
                                    min={0.5}
                                    max={10}
                                    step={0.5}
                                />
                                <NumberSettingRow
                                    label="Путь"
                                    settingKey="trackStrokeWidth"
                                    min={0.5}
                                    max={10}
                                    step={0.5}
                                />
                                <NumberSettingRow
                                    label="Провод"
                                    settingKey="wireLineStrokeWidth"
                                    min={0.5}
                                    max={10}
                                    step={0.5}
                                />
                            </Stack>
                        </Accordion.Panel>
                    </Accordion.Item>

                    {/* ── Размеры шрифтов ── */}
                    <Accordion.Item value="fonts">
                        <Accordion.Control>
                            <Text size="sm" fw={500}>
                                Размеры шрифтов
                            </Text>
                        </Accordion.Control>
                        <Accordion.Panel>
                            <Stack gap="xs">
                                <NumberSettingRow label="Номер опоры" settingKey="poleLabelSize" min={1} max={30} />
                                <NumberSettingRow label="Длина пролёта" settingKey="spanLabelSize" min={1} max={30} />
                                <NumberSettingRow
                                    label="Подпись ВЛ"
                                    settingKey="vlPoleLabelFontSize"
                                    min={1}
                                    max={30}
                                />
                                <NumberSettingRow label="Зигзаг" settingKey="zigzagLabelFontSize" min={1} max={30} />
                                <NumberSettingRow
                                    label="Символ провода"
                                    settingKey="wireSymbolFontSize"
                                    min={1}
                                    max={30}
                                />
                            </Stack>
                        </Accordion.Panel>
                    </Accordion.Item>

                    {/* ── Зигзаг ── */}
                    <Accordion.Item value="zigzag">
                        <Accordion.Control>
                            <Text size="sm" fw={500}>
                                Зигзаг
                            </Text>
                        </Accordion.Control>
                        <Accordion.Panel>
                            <Stack gap="xs">
                                <NumberSettingRow
                                    label="Масштаб отрисовки"
                                    settingKey="zigzagDrawScale"
                                    min={0.001}
                                    max={1}
                                    step={0.001}
                                />
                                <NumberSettingRow
                                    label="Размер символа"
                                    settingKey="zigzagSymbolSize"
                                    min={1}
                                    max={20}
                                />
                            </Stack>
                        </Accordion.Panel>
                    </Accordion.Item>
                </Accordion>

                <Group justify="space-between">
                    <Button
                        variant="subtle"
                        color="red"
                        size="xs"
                        onClick={() => displaySettingsStore.resetToDefaults()}
                    >
                        Сбросить по умолчанию
                    </Button>
                    <Button size="xs" onClick={onClose}>
                        Закрыть
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
});

DisplaySettingsModal.displayName = "DisplaySettingsModal";
