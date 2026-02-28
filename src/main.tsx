import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./app";
import { init } from "./app/compositionRoot";

const { services, store } = init();

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App services={services} store={store} />
    </StrictMode>,
);
