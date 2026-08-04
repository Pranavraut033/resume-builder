// ponytail: PDF export renders react-pdf style objects, not real DOM, so it
// has no way to measure content and compute a "fit to one page" zoom scale
// itself. TemplateEngine (the DOM engine) is the only place that can measure,
// so it writes the scale it computes here on every render; resolvePDFCustomization
// reads it back at export time. Deliberately a bare module-level value, not
// React state — this is a one-shot handoff between two independent render
// paths (DOM vs. PDF), not UI state.
let fitScale = 1;

/** Set by TemplateEngine whenever it (re)computes the fit-to-page zoom scale. */
export function setFitScale(scale: number): void {
  fitScale = scale;
}

/** Read by resolvePDFCustomization at PDF export time. */
export function getFitScale(): number {
  return fitScale;
}
