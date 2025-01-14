export const SUBTYPE_DEFAULT = 'Unspecific';

export const API_BASE = 'https://exbio.wzw.tum.de/sponge-api';

export const AS_DESCRIPTIONS: { [key: string]: string } = {
  SE: 'Skipping Exon',
  A5: "Alternative 5' Splice Site",
  A3: "Alternative 3' Splice Site",
  MX: 'Mutually Exclusive Exon',
  RI: 'Retained Intron',
  AF: 'Alternative First Exon',
  AL: 'Alternative Last Exon',
};

export const SPONGE_EXAMPLE_URL =
  'https://exbio.wzw.tum.de/sponge-files/GSE123845_exp_tpm_matrix_processed.csv';
