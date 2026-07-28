import { DISEASE_GENE_TYPES } from '../constants/disease-gene-types';

/**
 * Retrieves all gene/transcript types contained in the full network for a given disease and version.
 * Optionally merges any additional types passed via `nodeGeneTypes` (e.g. from custom predictions).
 */
export function getGeneTypesForDisease(
  diseaseName?: string,
  version?: number,
  nodeGeneTypes?: string[]
): string[] {
  const typeSet = new Set<string>();

  if (diseaseName) {
    const dLower = diseaseName.trim().toLowerCase();
    if (version && DISEASE_GENE_TYPES.by_version_and_disease[`${version}:::${dLower}`]) {
      DISEASE_GENE_TYPES.by_version_and_disease[`${version}:::${dLower}`].forEach((t) => typeSet.add(t));
    } else if (DISEASE_GENE_TYPES.by_disease[dLower]) {
      DISEASE_GENE_TYPES.by_disease[dLower].forEach((t) => typeSet.add(t));
    }
  }

  if (nodeGeneTypes && nodeGeneTypes.length > 0) {
    nodeGeneTypes.forEach((t) => {
      if (t && t !== 'unknown') typeSet.add(t.trim());
    });
  }

  if (typeSet.size === 0) {
    DISEASE_GENE_TYPES.all_types.forEach((t) => typeSet.add(t));
  }

  return Array.from(typeSet).sort((a, b) => a.localeCompare(b));
}

/**
 * Formats a raw gene_type identifier into a clean display label.
 */
export function formatGeneType(type: string): string {
  if (!type || type === 'all') return 'All';

  const acronyms = new Set([
    'lncRNA',
    'lincRNA',
    'miRNA',
    'snRNA',
    'snoRNA',
    'tRNA',
    'rRNA',
    'scRNA',
    'scaRNA',
    'vaultRNA',
    'TEC',
    'RNA',
    'LoF',
    'CDS',
  ]);

  if (acronyms.has(type)) return type;

  return type
    .replace(/_/g, ' ')
    .split(' ')
    .map((word, idx) => {
      if (acronyms.has(word)) return word;
      if (idx === 0) return word.charAt(0).toUpperCase() + word.slice(1);
      return word;
    })
    .join(' ');
}
