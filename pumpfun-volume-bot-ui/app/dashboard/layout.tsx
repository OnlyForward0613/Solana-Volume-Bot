import React from "react";

import { Navbar } from "@/components/navbar";
import Loading from "@/components/Loading/Loading";
import LeftSideBar from "@/components/page/LeftSideBar";
import BundleLabs from "@/components/page/BundleLabs";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
      <>
        <Navbar />
        <Loading />
        <main className="w-full flex gap-5 min-w-[800px] px-6 pt-1 pb-6 flex-grow">
          <LeftSideBar />
          <BundleLabs />
          {children}
        </main>
      </>
    );
}
