/**
 * Hierarchical clustering (Ward linkage, Euclidean distance) that returns the dendrogram leaf
 * order, for ordering heatmap rows/columns client-side. Mirrors what the backend does for the
 * Explore heatmaps (scipy `linkage(method='ward')` + `dendrogram(...)['leaves']`).
 *
 * Nearest-neighbour-chain algorithm: O(n^2) time, O(n^2) memory (condensed distance matrix).
 */

/** Above this many points the distance matrix gets too large, so clustering is skipped. */
export const MAX_CLUSTER_POINTS = 3000;

/**
 * Leaf order of the Ward dendrogram of `points` (one array of features per point). Returns the
 * original order when there is nothing to cluster (fewer than 3 points) or too many points.
 */
export function wardLeafOrder(points: ArrayLike<number>[]): number[] {
  const n = points.length;
  const identity = Array.from({ length: n }, (_, i) => i);
  if (n < 3 || n > MAX_CLUSTER_POINTS) return identity;

  // Condensed matrix of SQUARED Euclidean distances; Ward is updated in squared space.
  const d = new Float64Array((n * (n - 1)) / 2);
  const at = (i: number, j: number) =>
    i < j ? (i * (2 * n - i - 1)) / 2 + (j - i - 1) : (j * (2 * n - j - 1)) / 2 + (i - j - 1);
  for (let i = 0; i < n - 1; i++) {
    const pi = points[i];
    for (let j = i + 1; j < n; j++) {
      const pj = points[j];
      let s = 0;
      for (let k = 0; k < pi.length; k++) {
        const diff = (pi[k] || 0) - (pj[k] || 0);
        s += diff * diff;
      }
      d[at(i, j)] = s;
    }
  }

  // Leaves are ids 0..n-1, internal nodes n..2n-2. A "slot" is a live cluster's position in `d`.
  const left = new Int32Array(n - 1);
  const right = new Int32Array(n - 1);
  const minLeaf = new Int32Array(2 * n - 1);
  for (let i = 0; i < n; i++) minLeaf[i] = i;
  const node = Int32Array.from({ length: n }, (_, i) => i);
  const size = new Int32Array(n).fill(1);
  const active = new Uint8Array(n).fill(1);

  const chain: number[] = [];
  let nextInternal = n;
  let remaining = n;
  let scan = 0;
  while (remaining > 1) {
    if (chain.length === 0) {
      while (!active[scan]) scan++;
      chain.push(scan);
    }
    for (;;) {
      const a = chain[chain.length - 1];
      let b = chain.length > 1 ? chain[chain.length - 2] : -1;
      let best = b >= 0 ? d[at(a, b)] : Infinity;
      for (let k = 0; k < n; k++) {
        if (!active[k] || k === a) continue;
        const dk = d[at(a, k)];
        if (dk < best) {
          best = dk;
          b = k;
        }
      }
      if (chain.length > 1 && b === chain[chain.length - 2]) {
        // Reciprocal nearest neighbours: merge a into b (Lance-Williams update for Ward).
        chain.pop();
        chain.pop();
        const na = size[a];
        const nb = size[b];
        for (let k = 0; k < n; k++) {
          if (!active[k] || k === a || k === b) continue;
          const nk = size[k];
          d[at(b, k)] = ((na + nk) * d[at(a, k)] + (nb + nk) * d[at(b, k)] - nk * best) / (na + nb + nk);
        }
        left[nextInternal - n] = node[a];
        right[nextInternal - n] = node[b];
        minLeaf[nextInternal] = Math.min(minLeaf[node[a]], minLeaf[node[b]]);
        node[b] = nextInternal++;
        size[b] = na + nb;
        active[a] = 0;
        remaining--;
        break;
      }
      chain.push(b);
    }
  }

  // Leaf order by iterative DFS; the child holding the lowest original index goes first so the
  // result is deterministic and stays close to the input order where the tree allows.
  const order: number[] = [];
  const stack = [nextInternal - 1];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (id < n) {
      order.push(id);
      continue;
    }
    const l = left[id - n];
    const r = right[id - n];
    if (minLeaf[l] <= minLeaf[r]) stack.push(r, l);
    else stack.push(l, r);
  }
  return order;
}

/** Row and column leaf orders for a matrix, clustering rows on their columns and vice versa. */
export function clusterMatrixOrders(matrix: number[][]): { rowOrder: number[]; colOrder: number[] } {
  const rowCount = matrix.length;
  const colCount = rowCount > 0 ? matrix[0].length : 0;
  const columns = Array.from({ length: colCount }, (_, c) => {
    const col = new Float64Array(rowCount);
    for (let r = 0; r < rowCount; r++) col[r] = matrix[r][c];
    return col;
  });
  return { rowOrder: wardLeafOrder(matrix), colOrder: wardLeafOrder(columns) };
}
