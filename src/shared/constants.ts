/**
 * Масштаб зигзага при отрисовке: SVG-единиц на 1 мм зигзага.
 * Пример: ±250 мм → ±5 SVG ед., ±400 мм → ±8 SVG ед.
 * Настраивается через DisplaySettingsStore.zigzagDrawScale.
 */
export const ZIGZAG_DRAW_SCALE = 0.02;

/** SVG-единиц на 1 метр габарита опоры КС */
export const CATENARY_POLE_SCALE_Y = 10;

/** Радиус опоры КС по умолчанию (SVG-единиц) */
export const CATENARY_POLE_RADIUS = 20;

/** Размер опоры ВЛ по умолчанию (SVG-единиц) */
export const VL_POLE_DEFAULT_SIZE = 6;

/** Шаг сетки привязки по оси X (SVG-единиц) */
export const SNAP_GRID_STEP_X = 1;

/** Радиус попадания: точка фиксации (px экрана) */
export const FIXING_POINT_HIT_RADIUS = 8;

/** Радиус попадания: опора (px экрана) */
export const POLE_HIT_RADIUS = 12;

/** Радиус попадания: провод (px экрана) */
export const WIRE_HIT_RADIUS = 6;

/** Радиус попадания: поперечина (px экрана) */
export const CROSS_SPAN_HIT_RADIUS = 6;
