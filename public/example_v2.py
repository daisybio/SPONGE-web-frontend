from spongeWebPy import *

transcript_modules = get_spongeEffectsModules(disease_name="breast", level="transcript")
gene_modules = get_spongeEffectsModules(disease_name="breast", level="gene")

transcript_gene_map = get_TranscriptGene(
    transcript_modules["transcript.enst_number"].unique()
)
transcript_modules = transcript_modules.merge(
    transcript_gene_map, on="transcript.enst_number"
)

transcript_modules = transcript_modules[
    ~transcript_modules["gene.ensg_number"].isin(gene_modules["gene.ensg_number"])
]

transcript_modules = transcript_modules.sort_values(
    by="mean_accuracy_decrease", ascending=False
)

print(transcript_modules)
