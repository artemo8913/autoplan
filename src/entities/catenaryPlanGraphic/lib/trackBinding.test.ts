import { describe, it, expect } from "vitest";

import { RelativeSidePosition } from "@/shared/types/catenaryTypes";

import { Railway } from "../model/Railway";
import { Track } from "../model/Track";

import { bindingGabarit, bindingPoleY, bindingSide, offsetFromGabarit, offsetFromY } from "./trackBinding";

const railway = new Railway({ name: "R", startX: 0, endX: 10000 });
/** Чётный путь: yOffsetMeters > 0 → directionMultiplier +1. Нечётный — наоборот. */
const evenTrack = new Track({ railway, name: "2", startX: 0, endX: 10000, yOffsetMeters: 5 });
const oddTrack = new Track({ railway, name: "1", startX: 0, endX: 10000, yOffsetMeters: -5 });

describe("trackBinding — габарит и сторона выводятся из знака", () => {
    it("габарит — модуль смещения, знак наружу не выходит", () => {
        expect(bindingGabarit({ track: evenTrack, offsetMeters: 3.1 })).toBe(3.1);
        expect(bindingGabarit({ track: evenTrack, offsetMeters: -3.1 })).toBe(3.1);
    });

    it("сторона по ходу движения зависит от направления пути", () => {
        // «+» = вниз по чертежу; на чётном пути это правая сторона, на нечётном — левая
        expect(bindingSide({ track: evenTrack, offsetMeters: 3.1 })).toBe(RelativeSidePosition.RIGHT);
        expect(bindingSide({ track: oddTrack, offsetMeters: 3.1 })).toBe(RelativeSidePosition.LEFT);
        expect(bindingSide({ track: evenTrack, offsetMeters: -3.1 })).toBe(RelativeSidePosition.LEFT);
    });

    it("опора ровно на оси пути стороны не имеет — считаем её правой", () => {
        expect(bindingSide({ track: evenTrack, offsetMeters: 0 })).toBe(RelativeSidePosition.RIGHT);
    });

    it("«габарит + сторона» и знаковое смещение переводятся друг в друга без потерь", () => {
        for (const track of [evenTrack, oddTrack]) {
            for (const side of [RelativeSidePosition.LEFT, RelativeSidePosition.RIGHT]) {
                const offsetMeters = offsetFromGabarit(3.1, side, track.directionMultiplier);
                const binding = { track, offsetMeters };

                expect(bindingGabarit(binding)).toBe(3.1);
                expect(bindingSide(binding)).toBe(side);
            }
        }
    });
});

describe("trackBinding — геометрия", () => {
    it("bindingPoleY и offsetFromY обратны друг другу", () => {
        const binding = { track: evenTrack, offsetMeters: 3.1 };
        const trackY = evenTrack.getPositionAtX(500).y;

        const poleY = bindingPoleY(binding, 500);
        expect(poleY).toBe(trackY + 31); // «+» вниз по чертежу
        expect(offsetFromY(poleY, trackY)).toBe(3.1);
    });

    it("offsetFromY округляет до шага габарита", () => {
        expect(offsetFromY(23.7, 0)).toBe(2.4);
        expect(offsetFromY(-23.7, 0)).toBe(-2.4);
    });
});
