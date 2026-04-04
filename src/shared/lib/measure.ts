export function formatKmPkM(coords: { km: number; pk: number; m: number }): string {
    return `КМ ${coords.km} ПК ${coords.pk}+${String(coords.m).padStart(2, "0")}`;
}

export function xToKmPkM(x: number): { km: number; pk: number; m: number } {
    const rounded = Math.round(x);
    const m = rounded % 100;
    const pk = Math.floor(rounded / 100) % 10;
    const km = Math.floor(rounded / 1000);
    return { km, pk, m };
}

export function formatOrdinateCompact(x: number): string {
    const { km, pk, m } = xToKmPkM(x);
    return `${km}км${pk}пк+${m}`;
}
