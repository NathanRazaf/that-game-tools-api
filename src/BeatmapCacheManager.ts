// ../BeatmapCacheManager.ts
import fs from 'fs';
import path from 'path';

interface BeatmapCacheEntry {
    beatmapId: number;
    accessCount: number;
    lastAccessed: number;
}

export class BeatmapCacheManager {
    private readonly cacheDir: string;
    private readonly maxSize: number;
    private readonly maxFiles: number;
    private cache: Map<number, BeatmapCacheEntry>;
    private accessHeap: MinHeap<BeatmapCacheEntry>;

    constructor(cacheDir: string, maxSize: number = 5 * 1024 * 1024 * 1024, maxFiles: number = 100000) {
        this.cacheDir = cacheDir;
        this.maxSize = maxSize;
        this.maxFiles = maxFiles;
        this.cache = new Map();
        this.accessHeap = new MinHeap<BeatmapCacheEntry>((a, b) => {
            if (a.accessCount === b.accessCount) {
                return a.lastAccessed - b.lastAccessed;
            }
            return a.accessCount - b.accessCount;
        });
        this.loadCache();
    }

    private loadCache() {
        try {
            const metadataPath = path.join(this.cacheDir, 'cache-metadata.json');
            let metadata: Record<number, BeatmapCacheEntry> = {};

            if (fs.existsSync(metadataPath)) {
                const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
                metadata = JSON.parse(metadataContent);
            }

            const files = fs.readdirSync(this.cacheDir);
            files.forEach(file => {
                const beatmapId = parseInt(path.basename(file, '.osu'), 10);
                if (!isNaN(beatmapId)) {
                    const stats = fs.statSync(path.join(this.cacheDir, file));
                    const cachedEntry = metadata[beatmapId] || {
                        beatmapId,
                        accessCount: 0,
                        lastAccessed: stats.atimeMs,
                    };
                    this.cache.set(beatmapId, cachedEntry);
                    this.accessHeap.insert(cachedEntry);
                }
            });

        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                console.warn(`Cache directory "${this.cacheDir}" does not exist. Skipping cache load.`);
            } else {
                throw error; // Re-throw unexpected errors
            }
        }
    }

    private saveMetadata() {
        try {
            const metadataPath = path.join(this.cacheDir, 'cache-metadata.json');
            const metadata: Record<number, BeatmapCacheEntry> = {};
            this.cache.forEach((entry, beatmapId) => {
                metadata[beatmapId] = entry;
            });
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
        } catch (error) {
            console.error(`Failed to save metadata: ${error}`);
        }
    }


    public accessBeatmap(beatmapId: number) {
        const now = Date.now();
        const entry = this.cache.get(beatmapId);
        if (entry) {
            entry.accessCount++;
            entry.lastAccessed = now;
            this.accessHeap.update(entry);
        } else {
            const newEntry = { beatmapId, accessCount: 1, lastAccessed: now };
            this.cache.set(beatmapId, newEntry);
            this.accessHeap.insert(newEntry);
        }
        this.maintainCache();
        this.saveMetadata(); // Save updated metadata
    }

    private maintainCache() {
        while (this.cache.size > this.maxFiles || this.getCacheSize() > this.maxSize) {
            const lfuEntry = this.accessHeap.extractMin();
            if (lfuEntry) {
                this.cache.delete(lfuEntry.beatmapId);
                fs.unlinkSync(path.join(this.cacheDir, `${lfuEntry.beatmapId}.osu`));
            }
        }
        this.saveMetadata(); // Save updated metadata after cleanup
    }

    private getCacheSize(): number {
        let totalSize = 0;
        this.cache.forEach((_, beatmapId) => {
            const stats = fs.statSync(path.join(this.cacheDir, `${beatmapId}.osu`));
            totalSize += stats.size;
        });
        return totalSize;
    }
}

export class MinHeap<T> {
    private heap: T[] = [];
    private compare: (a: T, b: T) => number;

    constructor(compareFn: (a: T, b: T) => number) {
        this.compare = compareFn;
    }

    public insert(value: T): void {
        this.heap.push(value);
        this.bubbleUp(this.heap.length - 1);
    }

    public extractMin(): T | undefined {
        if (this.heap.length === 0) return undefined;
        const min = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0 && last !== undefined) {
            this.heap[0] = last;
            this.bubbleDown(0);
        }
        return min;
    }

    public update(value: T): void {
        const index = this.heap.findIndex(item => this.compare(item, value) === 0);
        if (index !== -1) {
            this.heap[index] = value;
            this.bubbleUp(index);
            this.bubbleDown(index);
        }
    }

    private bubbleUp(index: number): void {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.compare(this.heap[index], this.heap[parentIndex]) >= 0) break;
            [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
            index = parentIndex;
        }
    }

    private bubbleDown(index: number): void {
        const length = this.heap.length;
        while (true) {
            let leftIndex = 2 * index + 1;
            let rightIndex = 2 * index + 2;
            let smallest = index;

            if (leftIndex < length && this.compare(this.heap[leftIndex], this.heap[smallest]) < 0) {
                smallest = leftIndex;
            }
            if (rightIndex < length && this.compare(this.heap[rightIndex], this.heap[smallest]) < 0) {
                smallest = rightIndex;
            }
            if (smallest === index) break;

            [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
            index = smallest;
        }
    }
}