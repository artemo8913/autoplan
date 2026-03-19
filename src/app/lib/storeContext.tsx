import { createContext, useContext } from "react";

import type { Store } from "../types";


export const StoreContext = createContext<Store>({} as Store);

export const useStore = () => {
    return useContext(StoreContext);
};

