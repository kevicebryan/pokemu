"use client";

import { createContext, useContext, useMemo } from "react";

type OutOfHeartsModalContextValue = {
  openOutOfHeartsModal: () => void;
};

const OutOfHeartsModalContext = createContext<OutOfHeartsModalContextValue | null>(
  null,
);

export function OutOfHeartsModalProvider({
  children,
  open,
}: {
  children: React.ReactNode;
  open: () => void;
}) {
  const value = useMemo(
    () => ({ openOutOfHeartsModal: open }),
    [open],
  );
  return (
    <OutOfHeartsModalContext.Provider value={value}>
      {children}
    </OutOfHeartsModalContext.Provider>
  );
}

export function useOutOfHeartsModal(): OutOfHeartsModalContextValue {
  const ctx = useContext(OutOfHeartsModalContext);
  if (!ctx) {
    throw new Error("useOutOfHeartsModal must be used within OutOfHeartsModalProvider");
  }
  return ctx;
}
