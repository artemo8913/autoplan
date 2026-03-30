import { makeAutoObservable } from "mobx";

import { CATENARY_POLE_SCALE_Y, CATENARY_POLE_RADIUS, VL_POLE_DEFAULT_SIZE, ZIGZAG_DRAW_SCALE } from "@/shared/constants";

const STORAGE_KEY = "ech3_display_settings";

export interface DisplaySettings {
    // Масштабы и размеры
    catenaryPoleScaleY: number;
    catenaryPoleRadius: number;
    vlPoleDefaultSize: number;
    baseStroke: number;

    // Смещения лейблов
    poleLabelYOffset: number;
    spanLabelYOffset: number;
    vlPoleLabelXOffset: number;
    zigzagTextXOffset: number;
    zigzagTextYMultiplier: number;

    // Ширины линий
    catenaryStrokeWidth: number;
    fixingPointStrokeWidth: number;
    trackStrokeWidth: number;
    wireLineStrokeWidth: number;

    // Шрифты
    poleLabelSize: number;
    spanLabelSize: number;
    vlPoleLabelFontSize: number;
    zigzagLabelFontSize: number;
    wireSymbolFontSize: number;

    // Зигзаг
    zigzagDrawScale: number;
    zigzagSymbolSize: number;
}

export const DISPLAY_DEFAULTS: Readonly<DisplaySettings> = {
    catenaryPoleScaleY: CATENARY_POLE_SCALE_Y,
    catenaryPoleRadius: CATENARY_POLE_RADIUS,
    vlPoleDefaultSize: VL_POLE_DEFAULT_SIZE,
    baseStroke: 2,

    poleLabelYOffset: 40,
    spanLabelYOffset: 10,
    vlPoleLabelXOffset: 3,
    zigzagTextXOffset: 8,
    zigzagTextYMultiplier: 4,

    catenaryStrokeWidth: 4,
    fixingPointStrokeWidth: 1,
    trackStrokeWidth: 1,
    wireLineStrokeWidth: 1.5,

    poleLabelSize: 5,
    spanLabelSize: 5,
    vlPoleLabelFontSize: 8,
    zigzagLabelFontSize: 6,
    wireSymbolFontSize: 6,

    zigzagDrawScale: ZIGZAG_DRAW_SCALE,
    zigzagSymbolSize: 3,
};

const SETTING_KEYS = Object.keys(DISPLAY_DEFAULTS) as Array<keyof DisplaySettings>;

export class DisplaySettingsStore implements DisplaySettings {
    // Масштабы и размеры
    catenaryPoleScaleY = DISPLAY_DEFAULTS.catenaryPoleScaleY;
    catenaryPoleRadius = DISPLAY_DEFAULTS.catenaryPoleRadius;
    vlPoleDefaultSize = DISPLAY_DEFAULTS.vlPoleDefaultSize;
    baseStroke = DISPLAY_DEFAULTS.baseStroke;

    // Смещения лейблов
    poleLabelYOffset = DISPLAY_DEFAULTS.poleLabelYOffset;
    spanLabelYOffset = DISPLAY_DEFAULTS.spanLabelYOffset;
    vlPoleLabelXOffset = DISPLAY_DEFAULTS.vlPoleLabelXOffset;
    zigzagTextXOffset = DISPLAY_DEFAULTS.zigzagTextXOffset;
    zigzagTextYMultiplier = DISPLAY_DEFAULTS.zigzagTextYMultiplier;

    // Ширины линий
    catenaryStrokeWidth = DISPLAY_DEFAULTS.catenaryStrokeWidth;
    fixingPointStrokeWidth = DISPLAY_DEFAULTS.fixingPointStrokeWidth;
    trackStrokeWidth = DISPLAY_DEFAULTS.trackStrokeWidth;
    wireLineStrokeWidth = DISPLAY_DEFAULTS.wireLineStrokeWidth;

    // Шрифты
    poleLabelSize = DISPLAY_DEFAULTS.poleLabelSize;
    spanLabelSize = DISPLAY_DEFAULTS.spanLabelSize;
    vlPoleLabelFontSize = DISPLAY_DEFAULTS.vlPoleLabelFontSize;
    zigzagLabelFontSize = DISPLAY_DEFAULTS.zigzagLabelFontSize;
    wireSymbolFontSize = DISPLAY_DEFAULTS.wireSymbolFontSize;

    // Зигзаг
    zigzagDrawScale = DISPLAY_DEFAULTS.zigzagDrawScale;
    zigzagSymbolSize = DISPLAY_DEFAULTS.zigzagSymbolSize;

    constructor() {
        makeAutoObservable(this);
        this._loadFromStorage();
    }

    set<K extends keyof DisplaySettings>(key: K, value: DisplaySettings[K]): void {
        (this[key] as DisplaySettings[K]) = value;
    }

    resetToDefaults(): void {
        Object.assign(this, DISPLAY_DEFAULTS);
    }

    saveToStorage(): void {
        const plain: Record<string, unknown> = {};
        for (const key of SETTING_KEYS) {
            plain[key] = this[key];
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(plain));
    }

    private _loadFromStorage(): void {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return;
            }
            const parsed = JSON.parse(raw) as Partial<DisplaySettings>;
            for (const key of SETTING_KEYS) {
                if (key in parsed && typeof parsed[key] === typeof DISPLAY_DEFAULTS[key]) {
                    (this[key] as DisplaySettings[typeof key]) = parsed[key] as DisplaySettings[typeof key];
                }
            }
        } catch {
            // Невалидный JSON — используем defaults
        }
    }
}
