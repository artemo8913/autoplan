import type { PlaceableEntityConfig } from "@/shared/types/toolTypes";

//TODO: Использовать изображения уже имеющихся компонентов, чтобы отрисовка сооответствовала
const CatenaryPolePreviewSymbol: React.FC<{ material?: string }> = ({ material }) => {
    if (material === "concrete") {
        return <circle cx={0} cy={0} r={6} fill="none" stroke="currentColor" strokeWidth={1.5} />;
    }
    if(material === "metal"){
        return <rect x={-5} y={-5} width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.5} />;
    }
}

const VlPolePreviewSymbol: React.FC<{ vlType?: string }> = ({ vlType }) => {
    if(vlType === "vlType"){
        return <circle cx={0} cy={0} r={6} fill="none" stroke="currentColor" strokeWidth={1.5} />;
    }
    if( vlType === "angular") {
        return <polygon points="0,-7 6,5 -6,5" fill="none" stroke="currentColor" strokeWidth={1.5} />;
    }
    if( vlType === "terminal") {
        return <rect x={-5} y={-5} width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.5} />;
    }
    return <circle cx={0} cy={0} r={5} fill="none" stroke="currentColor" strokeWidth={1} />;
};

export const PolePreviewSymbol: React.FC<{ config: PlaceableEntityConfig }> = ({config}) => {
    if(config.kind === "catenaryPole"){
        return <CatenaryPolePreviewSymbol material={config.material} />
    }

    if(config.kind === "vlPole"){
        return <VlPolePreviewSymbol vlType={config.vlType}  />
    }
}