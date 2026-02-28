import type { Store } from "../model/types";
import { StoreContext } from "./storeContext";

export const StoreProvider: React.FC<React.PropsWithChildren<{ store: Store }>> = ({ store, children }) => {
    return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
};