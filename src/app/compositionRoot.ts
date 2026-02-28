import type { Store } from "./store";
import type { Services } from "./services";

import { SVGDrawer } from "../shared/utils/SVGDrawer";
import { CounterStore } from "@/entities/counter";

export function init(): {services: Services, store: Store}{
    // services
    const svgDrawer = new SVGDrawer();
    
    // store
    const counterStore = new CounterStore();

    return {
        services: {
            svgDrawer
        },
        store: {
            counterStore
        }
    };
}