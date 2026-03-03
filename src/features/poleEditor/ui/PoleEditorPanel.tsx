import { observer } from "mobx-react-lite";

import { RelativeSidePosition } from "@/shared/types";
import { useStore } from "@/app/store";


export const PoleEditorPanel = observer(() => {
    const {projectStore} = useStore();
    const pole = projectStore.selectedPole;

    if (!pole) return null;

    return (
        <div className="pole-editor-panel">
            <div className="pole-editor-header">
                <span>Опора {pole.name}</span>
                <button type="button" onClick={() => projectStore.deselectPole()}>✕</button>
            </div>

            <div className="pole-editor-field">
                <label>Название</label>
                <input
                    type="text"
                    title="Название опоры"
                    value={pole.name}
                    onChange={e => pole.setName(e.target.value)}
                />
            </div>

            <div className="pole-editor-field">
                <label>Позиция X, м</label>
                <input
                    type="number"
                    title="Позиция X, м"
                    value={pole.x}
                    step={1}
                    onChange={e => {
                        const v = Number(e.target.value);
                        if (!isNaN(v)) pole.setX(v);
                    }}
                />
            </div>

            <div className="pole-editor-field">
                <label>Габарит, м</label>
                <input
                    type="number"
                    title="Габарит опоры, м"
                    value={pole.gabarit}
                    step={0.1}
                    min={0}
                    onChange={e => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v) && v >= 0) pole.setGabarit(v);
                    }}
                />
            </div>

            <div className="pole-editor-field">
                <label>Материал</label>
                <select
                    title="Материал опоры"
                    value={pole.material}
                    onChange={e => pole.setMaterial(e.target.value as "concrete" | "metal")}
                >
                    <option value="concrete">Ж/Б (окружность)</option>
                    <option value="metal">Металл (квадрат)</option>
                </select>
            </div>

            <div className="pole-editor-field">
                <label>Анкерная оттяжка</label>
                <select
                    title="Тип анкерной оттяжки"
                    value={pole.anchorGuy?.type ?? "none"}
                    onChange={e => {
                        const val = e.target.value;
                        if (val === "none") {
                            pole.setAnchorGuy(undefined);
                        } else {
                            pole.setAnchorGuy({
                                type: val as "single" | "double",
                                direction: pole.anchorGuy?.direction ?? RelativeSidePosition.LEFT,
                            });
                        }
                    }}
                >
                    <option value="none">Нет</option>
                    <option value="single">Одинарная</option>
                    <option value="double">Двойная</option>
                </select>
            </div>

            {pole.anchorGuy && (
                <div className="pole-editor-field">
                    <label>Направление оттяжки</label>
                    <select
                        title="Направление оттяжки"
                        value={pole.anchorGuy.direction}
                        onChange={e => pole.setAnchorGuy({
                            ...pole.anchorGuy!,
                            direction: Number(e.target.value) as RelativeSidePosition,
                        })}
                    >
                        <option value={RelativeSidePosition.LEFT}>Влево</option>
                        <option value={RelativeSidePosition.RIGHT}>Вправо</option>
                    </select>
                </div>
            )}

            <div className="pole-editor-field">
                <label>
                    <input
                        type="checkbox"
                        checked={!!pole.anchorBrace}
                        onChange={e => pole.setAnchorBrace(
                            e.target.checked
                                ? { direction: RelativeSidePosition.RIGHT }
                                : undefined
                        )}
                    />
                    {" "}Подкос
                </label>
            </div>
        </div>
    );
});
