"use client";

import dynamic from "next/dynamic";

const DynamicComponent = dynamic(() => import("@/components/page/AdminPage"), {
  ssr: false,
});

export default function Admin() {
  return <DynamicComponent />;
}
