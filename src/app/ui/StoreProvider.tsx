import { StoreContext } from "./storeContext";

import type { Store } from "../types";

export const StoreProvider: React.FC<React.PropsWithChildren<{ store: Store }>> = ({ store, children }) => {
    return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
};