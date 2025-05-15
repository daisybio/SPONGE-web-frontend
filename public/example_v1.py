import networkx as nx
import plotly.graph_objects as go
from spongeWebPy import *

# get top 10 hub genes (highest degree) from breast invasive carcinoma
topGenes = get_ceRNA(
    disease_name="breast invasive carcinoma",
    sorting="node_degree",
    limit=10,
)
# get all significant interactions between top genes
data = get_specific_ceRNAInteractions(
    disease_name="breast invasive carcinoma",
    gene_symbol=topGenes["gene.gene_symbol"],
    pValue=0.05,
    limit=100,
)

# create edge list for graph
elist = tuples = [
    tuple(x) for x in data[["gene1.gene_symbol", "gene2.gene_symbol"]].values
]
G = nx.Graph()
G.add_edges_from(elist)

# draw graph
pos = nx.circular_layout(G)
# nz.draw(G, pos=pos, node_size=8500)
# Create the plot
Xv = [pos[k][0] for k in pos]
Yv = [pos[k][1] for k in pos]
Xed = []
Yed = []
for edge in G.edges:
    Xed += [pos[edge[0]][0], pos[edge[1]][0], None]
    Yed += [pos[edge[0]][1], pos[edge[1]][1], None]

trace1 = go.Scatter(
    x=Xed,
    y=Yed,
    line=dict(width=0.5, color="black"),
    text=[
        "PPP1IR12B",
        "ABCA9",
        "DLCl",
        "TCF4",
        "LTBP2",
        "ARHGAP20",
        "ADGRA2",
        "LAMA2",
        "PLEKHH2",
        "FAT4",
    ],
    mode="lines",
)

trace1.text = (
    [
        "PPPIR12B",
        "ABCA9",
        "DLC1",
        "TCF4",
        "LTBP2",
        "ARHGAP20",
        "ADGRA2",
        "LAMA2",
        "PLEKHH2",
        "FAT4",
    ],
)

trace2 = go.Scatter(
    x=Xv,
    y=Yv,
    mode="markers+text",
    name="Markers and Text",
    text=[
        "<b>PPP1IR12B</b>",
        "<b>ABCA9</b>",
        "<b>DLC1</b>",
        "<b>TCF4</b>",
        "<b>LTBP2</b>",
        "<b>ARHGAP20</b>",
        "<b>ADGRA2/b>",
        "<b>LAMA2</b>",
        "<b>PLEKHH2</b>",
        "<b>FAT4</b>",
    ],
    textposition="bottom center",
    textfont=dict(family="sans serif", size=14, color="black"),
    marker=dict(
        showscale=True,
        colorscale="Plotly3",
        reversescale=True,
        color=[],
        size=16,
        colorbar=dict(
            thickness=15,
            title=dict(text="Node Connections", side="right"),
            xanchor="left",
        ),
        line_width=2,
    ),
)


# color nodes
node_adjacencies = []
node_text = []
for node, adjacencies in enumerate(G.adjacency()):
    node_adjacencies.append(len(adjacencies[1]))
    node_text.append("#V0f connections: " + str(len(adjacencies[1])))

trace2.marker.color = node_adjacencies
annot = ""

data = [trace1, trace2]
fig = go.Figure(
    data=data,
    layout=go.Layout(
        showlegend=False,
        margin=dict(b=20, l=5, r=5, t=20),
        annotations=[
            dict(
                showarrow=False,
                xref="paper",
                yref="paper",
                opacity=0.8,
                x=0.005,
                y=-0.002,
            )
        ],
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
    ),
)
fig["layout"]["annotations"][0]["text"] = annot
fig.show()
