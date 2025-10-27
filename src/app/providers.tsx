"use client";

import React from "react";
import {HeroUIProvider} from "@heroui/react";
import {ToastProvider} from "@heroui/toast";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({children}: ProvidersProps) {
  return (
    <HeroUIProvider>
      <ToastProvider
        placement="bottom-right"
        toastProps={{
          variant: "flat",
          radius: "md",
        }}
      />
      {children}
    </HeroUIProvider>
  );
}
