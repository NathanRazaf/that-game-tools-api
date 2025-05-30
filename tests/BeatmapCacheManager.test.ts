import fs from 'fs';
import path from 'path';
import { BeatmapCacheManager } from '../src/BeatmapCacheManager';

const TEST_CACHE_DIR = './test-cache';

describe('BeatmapCacheManager', () => {
    let cacheManager: BeatmapCacheManager;

    beforeEach(() => {
        if (!fs.existsSync(TEST_CACHE_DIR)) {
            fs.mkdirSync(TEST_CACHE_DIR);
        }
        cacheManager = new BeatmapCacheManager(TEST_CACHE_DIR, 100, 2);
    });

    afterEach(() => {
        if (fs.existsSync(TEST_CACHE_DIR)) {
            fs.rmSync(TEST_CACHE_DIR, { recursive: true, force: true });
        }
    });

    it('should load existing cache metadata for existing files', () => {
        const metadataPath = path.join(TEST_CACHE_DIR, 'cache-metadata.json');
        const metadata = {
            "1": { beatmapId: 1, accessCount: 5, lastAccessed: Date.now() },
        };
        fs.writeFileSync(metadataPath, JSON.stringify(metadata), 'utf-8');

        fs.writeFileSync(path.join(TEST_CACHE_DIR, '1.osu'), 'dummy content', 'utf-8');

        cacheManager = new BeatmapCacheManager(TEST_CACHE_DIR, 100, 2);
        expect(cacheManager['cache'].size).toBe(1);
    });

    it('should access beatmap and update metadata', () => {
        fs.writeFileSync(path.join(TEST_CACHE_DIR, '1.osu'), 'dummy content', 'utf-8');

        cacheManager.accessBeatmap(1);
        expect(cacheManager['cache'].get(1)).toEqual({
            beatmapId: 1,
            accessCount: 1,
            lastAccessed: expect.any(Number),
        });

        // Access a second time
        cacheManager.accessBeatmap(1);
        expect(cacheManager['cache'].get(1)).toEqual({
            beatmapId: 1,
            accessCount: 2,
            lastAccessed: expect.any(Number),
        });
    });

    it('should maintain cache maxFiles and evict LFU entries', () => {
        fs.writeFileSync(path.join(TEST_CACHE_DIR, '1.osu'), 'dummy content', 'utf-8');
        fs.writeFileSync(path.join(TEST_CACHE_DIR, '2.osu'), 'dummy content', 'utf-8');
        fs.writeFileSync(path.join(TEST_CACHE_DIR, '3.osu'), 'dummy content', 'utf-8');

        cacheManager.accessBeatmap(1);
        cacheManager.accessBeatmap(2);
        cacheManager.accessBeatmap(3);

        expect(cacheManager['cache'].size).toBe(2);
        expect(cacheManager['cache'].has(1)).toBe(false);
    });

    it('should save metadata after accessing a beatmap', () => {
        fs.writeFileSync(path.join(TEST_CACHE_DIR, '1.osu'), 'dummy content', 'utf-8');

        cacheManager.accessBeatmap(1);
        cacheManager.accessBeatmap(1);

        const metadataPath = path.join(TEST_CACHE_DIR, 'cache-metadata.json');
        const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);

        expect(metadata['1']).toEqual({
            beatmapId: 1,
            accessCount: 2,
            lastAccessed: expect.any(Number),
        });
    });
});