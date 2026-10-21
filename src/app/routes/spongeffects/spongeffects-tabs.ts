/**
 * Positions of the tabs on the SpongEffects pages; Explore Reference and Compute Scores use the
 * same order. Every check of the selected tab, the templates' tabReady() calls included, uses these
 * names, so reordering the tabs means changing this object along with the template order.
 */
export const SPONGEFFECTS_TABS = {
  network: 0,
  modules: 1,
  umap: 2,
  scoreDistribution: 3,
  /** Explore Reference only */
  benchmarking: 4,
  /** Compute Scores only */
  classification: 4,
} as const;
