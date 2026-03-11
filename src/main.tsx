import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App, init } from "./app";

const { services, store, inputHandler } = init();

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App services={services} store={store} inputHandler={inputHandler} />
    </StrictMode>,
);
