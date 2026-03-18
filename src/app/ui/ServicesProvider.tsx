import { ServicesContext } from "../lib/servicesContext";
import type { Services } from "../types";

export const ServicesProvider: React.FC<React.PropsWithChildren<{ services: Services }>> = ({ services, children }) => {
    return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
};
