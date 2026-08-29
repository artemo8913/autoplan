import { makeAutoObservable } from "mobx";

import { CATENARY_POLE_SCALE_Y } from "@/shared/constants";
import type { CrossSpan as ICrossSpan, CrossSpanType, Pole } from "@/shared/types/catenaryTypes";

interface CrossSpanConstructorParams {
    id?: string;
    spanType: CrossSpanType;
    poleA: Pole;
    poleB: Pole;
    beamMark?: string;
    wireMark?: string;
    loadKn?: number;
}

/**
 * Поперечина между двумя опорами КС: гибкая (тросовая) или жёсткая (ригель).
 *
 * Характеристики хранятся раздельно для двух типов — марка ригеля и марка троса живут
 * в разных полях и переживают смену типа: переключение «гибкая ⇄ жёсткая» не должно стирать
 * то, что было введено раньше. Наружу (панель, ведомости) отдаётся марка по текущему типу — `mark`.
 * Значения марок — свободный текст: справочника номенклатуры пока нет (п. 8.11 PLAN.md, ЕТБ),
 * панель лишь подсказывает типовые.
 */
export class CrossSpan implements ICrossSpan {
    readonly id: string;
    readonly poleA: Pole;
    readonly poleB: Pole;
    spanType: CrossSpanType;
    beamMark?: string;
    wireMark?: string;
    loadKn?: number;

    constructor(params: CrossSpanConstructorParams) {
        this.id = params.id ?? crypto.randomUUID();
        this.spanType = params.spanType;
        this.poleA = params.poleA;
        this.poleB = params.poleB;
        this.beamMark = params.beamMark;
        this.wireMark = params.wireMark;
        this.loadKn = params.loadKn;

        makeAutoObservable(this, { id: false, poleA: false, poleB: false });
    }

    /** Марка конструкции по текущему типу: ригеля — у жёсткой, троса — у гибкой. */
    get mark(): string | undefined {
        return this.spanType === "rigid" ? this.beamMark : this.wireMark;
    }

    /**
     * Длина поперечины, м — расстояние между опорами (перекрываемое конструкцией).
     * По вертикали чертёж растянут (`CATENARY_POLE_SCALE_Y` SVG-единиц на метр),
     * поэтому Y возвращается в метры: иначе длина была бы в единицах картинки.
     */
    get length(): number {
        const dxMeters = this.poleB.x - this.poleA.x;
        const dyMeters = (this.poleB.pos.y - this.poleA.pos.y) / CATENARY_POLE_SCALE_Y;
        return Math.hypot(dxMeters, dyMeters);
    }

    setSpanType(value: CrossSpanType): void {
        this.spanType = value;
    }

    setBeamMark(value: string | undefined): void {
        this.beamMark = value;
    }

    setWireMark(value: string | undefined): void {
        this.wireMark = value;
    }

    setLoadKn(value: number | undefined): void {
        this.loadKn = value;
    }
}
