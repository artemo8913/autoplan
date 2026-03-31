export function formatKmPkM(coords: { km: number; pk: number; m: number }): string {
    return `КМ ${coords.km} ПК ${coords.pk}+${String(coords.m).padStart(2, "0")}`;
}
