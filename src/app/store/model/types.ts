import type { CounterStore } from "@/entities/counter";
import type { ProjectStore } from "./projectStore";

export interface Store {
    counterStore: CounterStore;
    projectStore: ProjectStore;
}