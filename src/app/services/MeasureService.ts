/**
 * @deprecated не тянет на звание сервиса. Сервис - это что-то связанное с бизнес-логикой,
 * ласс, который каким-то образом работает со структурами данных (с хранилищем)
 * здесь же просто вспомонательные функции
 * TODO: в shared/lib/measure или аналогичный смысл
 */
export class MeasureService {
    formatKmPkM(coords: { km: number; pk: number; m: number }): string {
        return `КМ ${coords.km} ПК ${coords.pk}+${String(coords.m).padStart(2, "0")}`;
    }

    svgXToKmPkM(
        svgX: number,
        startKm: number = 0,
        metersPerSvgUnit: number = 1,
    ): { km: number; pk: number; m: number } {
        const totalMeters = svgX * metersPerSvgUnit + startKm * 1000;
        const km = Math.floor(totalMeters / 1000);
        const remaining = totalMeters - km * 1000;
        const pk = Math.floor(remaining / 100);
        const m = Math.round(remaining - pk * 100);
        return { km, pk, m };
    }
}
