import type { FixingPoint } from "../model/FixingPoint";

export function moveFixingPoint(fps: FixingPoint[], id: string, direction: "up" | "down"): FixingPoint[] {
    const idx = fps.findIndex((fp) => fp.id === id);
    if (idx === -1) return fps;

    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= fps.length) return fps;

    const arr = [...fps];
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    return arr;
}

export function insertFixingPointAfter(fps: FixingPoint[], afterId: string, fp: FixingPoint): FixingPoint[] {
    const idx = fps.findIndex((f) => f.id === afterId);
    const arr = [...fps];
    arr.splice(idx + 1, 0, fp);
    return arr;
}

export function removeFixingPoint(fps: FixingPoint[], id: string): FixingPoint[] {
    return fps.filter((fp) => fp.id !== id);
}
