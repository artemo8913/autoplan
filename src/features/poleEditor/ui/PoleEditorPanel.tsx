import { observer } from "mobx-react-lite";

import { RelativeSidePosition, type GroundingType } from "@/shared/types/catenaryTypes";
import { useStore } from "@/app";


export const PoleEditorPanel = observer(() => {
    const { uiStore, polesStore } = useStore();
    const pole = uiStore.selectedIds[0] ? polesStore.poles.get(uiStore.selectedIds[0]) : null;

    if (!pole) return null;

    return (
        <div className="pole-editor-panel">
            <div className="pole-editor-header">
                <span>Опора {pole.name}</span>
                <button type="button" onClick={() => uiStore.resetToIdle()}>✕</button>
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
                    value={pole.primaryGabarit}
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

            <div className="pole-editor-field">
                <label>Заземление</label>
                <select
                    title="Тип заземления"
                    value={pole.grounding ?? "none"}
                    onChange={e => {
                        const val = e.target.value;
                        pole.setGrounding(val === "none" ? undefined : val as GroundingType);
                    }}
                >
                    <option value="none">Нет</option>
                    <option value="И">И — индивидуальное</option>
                    <option value="ИИ">ИИ — двойное инд.</option>
                    <option value="ИДЗ">ИДЗ — инд. диодная защита</option>
                    <option value="ГДЗ">ГДЗ — групповая диодная</option>
                    <option value="ТГЗ">ТГЗ — тросовое групповое</option>
                </select>
            </div>
        </div>
    );
});
