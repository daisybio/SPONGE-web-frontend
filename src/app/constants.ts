export const SUBTYPE_DEFAULT = 'Unspecific';

export const API_BASE = 'https://exbio.wzw.tum.de/sponge-api-dev';

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

export const IGV_REFGENOME = {
  id: 'hg38',
  name: 'Human (GRCh38/hg38)',
  assembly: 'GCA_000001405.15',
  taxon: 9606,
  fastaURL: 'https://igv.org/genomes/data/hg38/hg38.fa',
  indexURL: 'https://igv.org/genomes/data/hg38/hg38.fa.fai',
  refGeneURL:
    'https://hgdownload.soe.ucsc.edu/goldenPath/hg38/database/ncbiRefSeqSelect.txt.gz',
  cytobandURL:
    'https://hgdownload.soe.ucsc.edu/goldenPath/hg38/database/cytoBandIdeo.txt.gz',
  aliasURL: 'https://igv.org/genomes/data/hg38/hg38_alias.tab',
  twoBitURL:
    'https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.2bit',
  chromSizesURL:
    'https://hgdownload.soe.ucsc.edu/goldenPath/hg38/bigZips/hg38.chrom.sizes',
  chromosomeOrder:
    'chr1,chr2,chr3,chr4,chr5,chr6,chr7,chr8,chr9,chr10,chr11,chr12,chr13,chr14,chr15,chr16,chr17,chr18,chr19,chr20,chr21,chr22,chrX,chrY',
};
