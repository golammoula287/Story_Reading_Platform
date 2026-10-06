// Provider adapters may render ordinary display ads only. This interface cannot grant unlocks.
export type DisplayAdOutcome = 'filled' | 'no-fill' | 'blocked' | 'error';
export type DisplayAdProvider = {
  requiresConsent: boolean;
  mount: (
    element: HTMLElement,
    slotId: string,
    report: (outcome: DisplayAdOutcome) => void,
  ) => () => void;
};
// A client-owned provider and approved consent flow have not yet been selected.
// Keep third-party requests disabled until a real adapter is configured and verified.
export const displayAdProvider: DisplayAdProvider | null = null;
