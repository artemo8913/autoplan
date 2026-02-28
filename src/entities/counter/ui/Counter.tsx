import type { FC } from "react";
import { observer } from "mobx-react-lite";

import { useStore } from "@/app/store";

export const Counter: FC = observer(() => {
    const { counterStore } = useStore();

    return <div>
        <h2>Counter: {counterStore.count}</h2>
        <button onClick={() => counterStore.increment()}>Increment</button>
        <button onClick={() => counterStore.decrement()}>Decrement</button>
    </div>;
});