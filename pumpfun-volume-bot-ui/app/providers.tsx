"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { HeroUIProvider } from "@heroui/system";
import { useRouter } from "next/navigation";
import { ReduxProvider } from "./redux-provider";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>["push"]>[1]
    >;
  }
}

export function Providers({ children }: ProvidersProps) {
  const router = useRouter();

  return (
      <HeroUIProvider navigate={router.push}>
        <ReduxProvider>
          <>
            {children}
            <ToastContainer position="top-center" />
          </>
        </ReduxProvider>
      </HeroUIProvider>
  );
}
