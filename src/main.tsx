import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";

import { App, init } from "./app";
import { theme } from "./app/theme";
import "./app/style/global.css";

const { services, store } = init();

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <MantineProvider theme={theme}>
            <App services={services} store={store} />
        </MantineProvider>
    </StrictMode>,
);
