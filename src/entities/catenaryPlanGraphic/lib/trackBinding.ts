import { RelativeSidePosition } from "@/shared/types/catenaryTypes";
import { CATENARY_POLE_SCALE_Y, GABARIT_SNAP_STEP_M } from "@/shared/constants";

import type { Track } from "../model/Track";

/**
 * Привязка опоры к одному пути — одно знаковое смещение вместо пары «модуль + сторона».
 *
 * Знак `offsetMeters` — как у `Track.yOffsetMeters`: «+» вниз по чертежу (чётная сторона),
 * «−» вверх (нечётная). Одна ось на весь проект: смещение пути от оси участка и смещение
 * опоры от оси пути считаются в одну сторону.
 *
 * Габарит по ГОСТ — величина неотрицательная, поэтому наружу (подписи, таблица-сетка,
 * ведомости, панели) идёт `bindingGabarit` = |offsetMeters|, а сторона «по ходу движения»
 * выводится через `bindingSide`.
 */
export interface TrackBinding {
    track: Track;
    offsetMeters: number;
}

/** Габарит до пути, м — всегда >= 0. Единственная форма, пригодная для показа человеку. */
export function bindingGabarit(binding: TrackBinding): number {
    return Math.abs(binding.offsetMeters);
}

/**
 * Сторона опоры по ходу движения: знак смещения, приведённый к направлению пути.
 * Вырожденный случай (опора ровно на оси пути) стороны не имеет — считаем её правой,
 * как и любой габарит, округлившийся в ноль.
 */
export function bindingSide(binding: TrackBinding): RelativeSidePosition {
    const sign = Math.sign(binding.offsetMeters) || 1;
    return (sign * binding.track.directionMultiplier) as RelativeSidePosition;
}

/** Обратный перевод: «габарит + сторона» (ввод пользователя, XLSX, старый формат) → смещение. */
export function offsetFromGabarit(gabarit: number, side: RelativeSidePosition, directionMultiplier: -1 | 1): number {
    return roundOffset(gabarit * side * directionMultiplier);
}

/** Смещение с сохранением стороны: панель вводит габарит, сторона остаётся прежней. */
export function offsetWithGabarit(binding: TrackBinding, gabarit: number): number {
    return roundOffset(Math.abs(gabarit) * (Math.sign(binding.offsetMeters) || 1));
}

/** Y опоры на оси X по одной привязке. */
export function bindingPoleY(binding: TrackBinding, x: number): number {
    return binding.track.getPositionAtX(x).y + binding.offsetMeters * CATENARY_POLE_SCALE_Y;
}

/**
 * Смещение опоры, стоящей в poleY, относительно пути — обратная операция к `bindingPoleY`.
 * Округляется до шага габарита: в плане это величина с одним знаком после запятой.
 */
export function offsetFromY(poleY: number, trackY: number): number {
    return roundOffset((poleY - trackY) / CATENARY_POLE_SCALE_Y);
}

/** Округление до шага габарита без хвостов вида 2.4000000000000004. */
export function roundOffset(offsetMeters: number): number {
    return Math.round(Math.round(offsetMeters / GABARIT_SNAP_STEP_M) * GABARIT_SNAP_STEP_M * 1000) / 1000;
}
