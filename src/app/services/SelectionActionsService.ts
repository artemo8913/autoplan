import type { SelectionStore } from "../store/SelectionStore";
import type { ConfirmDialogStore } from "../store/ConfirmDialogStore";
import type { EntityService } from "./EntityService";
import { describeDeletion, totalDeletionCount } from "./deletionMessages";

/**
 * Действия над текущим выделением — общие для клавиатуры (Delete) и контекстного меню.
 *
 * Вынесены из `InputHandler`, чтобы у обоих входов было одно подтверждение
 * и одна формулировка последствий каскада.
 */
export class SelectionActionsService {
    constructor(
        private readonly selectionStore: SelectionStore,
        private readonly entityService: EntityService,
        private readonly confirmDialogStore: ConfirmDialogStore,
    ) {}

    /**
     * Удаление выделенного с подтверждением — как в панелях: сначала показываем,
     * что именно уйдёт вместе с выделением (каскад), и только потом удаляем.
     */
    async deleteSelection(): Promise<void> {
        const ids = this.selectionStore.selectedIds;
        if (ids.length === 0) {
            return;
        }

        const counts = this.entityService.getDeletePreview(ids);
        if (totalDeletionCount(counts) === 0) {
            return;
        }

        const confirmed = await this.confirmDialogStore.ask({
            title: "Подтверждение удаления",
            message: "Будет удалено:",
            details: describeDeletion(counts),
            confirmLabel: "Удалить",
            danger: true,
        });

        if (!confirmed) {
            return;
        }

        this.entityService.deleteEntities(ids);
        this.selectionStore.clear();
    }
}
