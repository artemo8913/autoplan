import type { Services } from "../model/types";
import { ServicesContext } from "./servicesContext";

export const ServicesProvider: React.FC<React.PropsWithChildren<{ services: Services }>> = ({ services, children }) => {
    return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
};