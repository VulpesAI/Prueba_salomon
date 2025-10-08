import dynamic from "next/dynamic";

export const CategoriesDonut = dynamic(() => import("./CategoriesDonut.client"), { ssr: false });
