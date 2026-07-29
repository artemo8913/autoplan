import { createContext, useContext } from "react";

import type { Services } from "../types";

export const ServicesContext = createContext<Services>({} as Services);

export const useServices = () => {
    return useContext(ServicesContext);
};

