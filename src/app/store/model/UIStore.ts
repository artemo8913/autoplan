import { makeAutoObservable } from "mobx";

export class UIStore {
    selectedPoleId: string | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    selectPole(id: string) {
        this.selectedPoleId = id;
    }

    deselectPole() {
        this.selectedPoleId = null;
    }
}
