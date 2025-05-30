import { MinHeap } from '../src/BeatmapCacheManager';

describe('MinHeap', () => {
    let heap: MinHeap<number>;

    beforeEach(() => {
        heap = new MinHeap<number>((a, b) => a - b);
    });

    it('should insert and extract min correctly', () => {
        heap.insert(3);
        heap.insert(1);
        heap.insert(2);

        expect(heap.extractMin()).toBe(1);
        expect(heap.extractMin()).toBe(2);
        expect(heap.extractMin()).toBe(3);
    });


    it('should handle empty heap correctly', () => {
        expect(heap.extractMin()).toBeUndefined();
    });
});