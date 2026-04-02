import React, { useState } from "react";
import { Text } from "@mantine/core";

import styles from "./LinesEditorPanel.module.css";

interface CollapsibleSectionProps {
    title: React.ReactNode;
    defaultOpen?: boolean;
    level?: number;
    extra?: React.ReactNode;
    children: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    defaultOpen = true,
    level = 0,
    extra,
    children,
}) => {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div>
            <div className={styles.section__header}>
                <div className={styles.section__toggle} onClick={() => setOpen((v) => !v)}>
                    <span className={styles.section__chevron} data-open={open}>
                        ▸
                    </span>
                    {typeof title === "string" ? (
                        <Text size={level === 0 ? "sm" : "xs"} fw={level === 0 ? 600 : 500}>
                            {title}
                        </Text>
                    ) : (
                        title
                    )}
                </div>
                {extra}
            </div>
            {open && <div className={styles.section__children}>{children}</div>}
        </div>
    );
};
