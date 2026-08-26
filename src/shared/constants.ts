/**
 * Масштаб зигзага при отрисовке: SVG-единиц на 1 мм зигзага.
 * Пример: ±250 мм → ±5 SVG ед., ±400 мм → ±8 SVG ед.
 * Настраивается через DisplaySettingsStore.zigzagDrawScale.
 */
export const ZIGZAG_DRAW_SCALE = 0.02;

/** SVG-единиц на 1 метр габарита опоры КС */
export const CATENARY_POLE_SCALE_Y = 10;

/** Радиус опоры КС по умолчанию (SVG-единиц) */
export const CATENARY_POLE_RADIUS = 12;

/** Размер опоры ВЛ по умолчанию (SVG-единиц) */
export const VL_POLE_DEFAULT_SIZE = 6;

/** Шаг сетки привязки по оси X (SVG-единиц) */
export const SNAP_GRID_STEP_X = 1;

/**
 * Шаг сетки привязки габарита опоры КС, м.
 * Мышью точнее всё равно не поставить, а габарит в плане — величина с одним знаком после запятой.
 */
export const GABARIT_SNAP_STEP_M = 0.1;

/** Стандартная длина пикета, м */
export const PICKET_LENGTH_M = 100;

/** Стандартное число пикетов в километре */
export const PICKETS_PER_KM = 10;

/** Стандартная длина километра, м */
export const KM_LENGTH_M = PICKET_LENGTH_M * PICKETS_PER_KM;

/** Радиус попадания: точка фиксации (px экрана) */
export const FIXING_POINT_HIT_RADIUS = 8;

/** Радиус попадания: опора (px экрана) */
export const POLE_HIT_RADIUS = 12;

/** Радиус попадания: провод (px экрана) */
export const WIRE_HIT_RADIUS = 6;

/** Радиус попадания: поперечина (px экрана) */
export const CROSS_SPAN_HIT_RADIUS = 6;
