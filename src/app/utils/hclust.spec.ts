import { clusterMatrixOrders, MAX_CLUSTER_POINTS, wardLeafOrder } from './hclust';

describe('hclust', () => {
  const span = (order: number[], members: number[]) => {
    const positions = members.map((m) => order.indexOf(m));
    return Math.max(...positions) - Math.min(...positions) + 1;
  };

  it('keeps the input order when there is nothing to cluster', () => {
    expect(wardLeafOrder([])).toEqual([]);
    expect(wardLeafOrder([[1]])).toEqual([0]);
    expect(wardLeafOrder([[1], [2]])).toEqual([0, 1]);
  });

  it('keeps the input order above the size cap', () => {
    const points = Array.from({ length: MAX_CLUSTER_POINTS + 1 }, (_, i) => [i % 7]);
    expect(wardLeafOrder(points)).toEqual(points.map((_, i) => i));
  });

  it('returns a permutation of all indices', () => {
    const points = Array.from({ length: 30 }, (_, i) => [Math.sin(i) * 5, Math.cos(i * 3) * 5, i % 4]);
    const order = wardLeafOrder(points);
    expect([...order].sort((a, b) => a - b)).toEqual(points.map((_, i) => i));
  });

  it('places each obvious group in one contiguous block', () => {
    const order = wardLeafOrder([[0, 0], [10, 10], [0.1, 0.2], [10.2, 9.9], [0.2, 0.1], [9.9, 10.1]]);
    expect(span(order, [0, 2, 4])).toBe(3);
    expect(span(order, [1, 3, 5])).toBe(3);
  });

  it('tolerates NaN values and duplicate points', () => {
    expect(wardLeafOrder([[NaN, 1], [0, 1], [5, 5], [5.1, 5]]).length).toBe(4);
    expect(wardLeafOrder([[1, 1], [1, 1], [1, 1], [9, 9]]).length).toBe(4);
  });

  it('orders matrix rows and columns independently', () => {
    const matrix = [
      [1, 9, 1, 9, 1, 9],
      [1.1, 9.1, 0.9, 8.9, 1.2, 9.2],
      [9, 1, 9, 1, 9, 1],
      [9.1, 0.9, 8.9, 1.1, 9.2, 1.2],
    ];
    const { rowOrder, colOrder } = clusterMatrixOrders(matrix);
    expect(span(rowOrder, [0, 1])).toBe(2);
    expect(span(rowOrder, [2, 3])).toBe(2);
    expect(span(colOrder, [0, 2, 4])).toBe(3);
    expect(span(colOrder, [1, 3, 5])).toBe(3);
  });
});
