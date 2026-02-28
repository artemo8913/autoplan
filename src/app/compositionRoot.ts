import type { Services } from "./services";

import { SVGDrawer } from "../shared/SVGDrawer";


export interface Store {

}

export function init(): {services: Services, store: Store}{
    const svgDrawer = new SVGDrawer();

    return {
        services: {
            svgDrawer
        },
        store: {

        }
    };
}