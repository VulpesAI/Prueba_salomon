import dynamic from "next/dynamic";

export const FluxChart = dynamic(() => import("./FluxChart.client"), { ssr: false });
