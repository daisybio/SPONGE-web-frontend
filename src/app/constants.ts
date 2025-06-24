export const SUBTYPE_DEFAULT = 'Unspecific';

export const API_BASE = 'https://exbio.wzw.tum.de/sponge-api';
// export const API_BASE = 'http://127.0.0.1:5555/sponge-api';

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

export const EXAMPLE_PREDICTION_URL =
  'https://exbio.wzw.tum.de/sponge-files/example_prediction.json';
export const IGV_REFGENOME = {
  id: 'hg38',
  name: 'Human (GRCh38/hg38)',
  assembly: 'GCA_000001405.15',
  taxon: 9606,
  fastaURL:
    'https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg38/hg38.fa',
  indexURL:
    'https://s3.amazonaws.com/igv.broadinstitute.org/genomes/seq/hg38/hg38.fa.fai',
  refGeneURL: 'https://s3.amazonaws.com/igv.org.genomes/hg38/refGene.txt.gz',
};
