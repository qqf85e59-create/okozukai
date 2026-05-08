"use client";

import { createContext, useContext } from "react";

export type Concept = "cosmic" | "pixel" | "workshop" | "arcade";

type ConceptCtx = { concept: Concept; setConcept: (c: Concept) => void };
const ConceptContext = createContext<ConceptCtx>({ concept: "workshop", setConcept: () => {} });

export function ConceptThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConceptContext.Provider value={{ concept: "workshop", setConcept: () => {} }}>
      {children}
    </ConceptContext.Provider>
  );
}

export function useConcept() {
  return useContext(ConceptContext);
}
