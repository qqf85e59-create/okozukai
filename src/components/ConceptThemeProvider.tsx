"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Concept = "cosmic" | "pixel" | "workshop";

const STORAGE_KEY = "okozukai-concept";
const DEFAULT: Concept = "workshop";

type ConceptCtx = { concept: Concept; setConcept: (c: Concept) => void };
const ConceptContext = createContext<ConceptCtx>({ concept: DEFAULT, setConcept: () => {} });

export function ConceptThemeProvider({ children }: { children: React.ReactNode }) {
  const [concept, setConceptState] = useState<Concept>(DEFAULT);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Concept | null;
    const initial = saved ?? DEFAULT;
    setConceptState(initial);
    document.documentElement.setAttribute("data-concept", initial);
  }, []);

  const setConcept = (c: Concept) => {
    setConceptState(c);
    localStorage.setItem(STORAGE_KEY, c);
    document.documentElement.setAttribute("data-concept", c);
  };

  return (
    <ConceptContext.Provider value={{ concept, setConcept }}>
      {children}
    </ConceptContext.Provider>
  );
}

export function useConcept() {
  return useContext(ConceptContext);
}
