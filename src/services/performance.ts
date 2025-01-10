import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { ScoreParams, PerformanceResult } from '../types/score';

async function deleteCacheFile(beatmapId: number, dir: string): Promise<void> {
    const cacheFilePath = path.join(dir, './cache', `${beatmapId}.osu`);
    console.log(`Deleting cache file: ${cacheFilePath}`);
    if (fs.existsSync(cacheFilePath)) {
        fs.unlinkSync(cacheFilePath);
    }
}

export async function calculatePerformance(scoreParams: ScoreParams, dir: string): Promise<PerformanceResult> {
    const { beatmapId, mods, accPercent, combo, nmiss, sliderTailMiss, largeTickMiss, n50, n100 } = scoreParams;

    const executablePath = path.join(dir, 'PerformanceCalculatorLinux', 'PerformanceCalculator');
    const modsExecArray = mods.flatMap((mod) => ['-m', mod.toUpperCase()]);

    let execArray = [
        'simulate', 'osu', beatmapId.toString(),
    ];

    if (combo !== undefined) execArray.push('-c', combo.toString());
    if (nmiss !== undefined) execArray.push('-X', nmiss.toString());
    if (sliderTailMiss !== undefined) execArray.push('-S', sliderTailMiss.toString());
    if (largeTickMiss !== undefined) execArray.push('-L', largeTickMiss.toString());
    if (accPercent !== undefined) execArray.push('-a', accPercent.toString());
    if (n50 !== undefined) execArray.push('-M', n50.toString());
    if (n100 !== undefined) execArray.push('-G', n100.toString());

    execArray = [...execArray, ...modsExecArray, '-j'];

    return new Promise((resolve, reject) => {
        execFile(executablePath, execArray, (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }

            try {
                const lines = stdout.split('\n');
                if (lines[0].includes('Downloading')) {
                    lines.shift();
                }
                const jsonOutput = JSON.parse(lines.join('\n'));

                deleteCacheFile(beatmapId, dir);

                const result: PerformanceResult = {
                    pp: parseFloat(jsonOutput.performance_attributes.pp.toFixed(3)),
                    stats: jsonOutput.score.statistics,
                    grade: calculateGrade(jsonOutput.score.statistics, mods),
                    star_rating: jsonOutput.difficulty_attributes.star_rating,
                    combo: jsonOutput.score.combo,
                    accuracy: jsonOutput.score.accuracy
                };

                console.log(`Performance calculated: ${result.pp}pp`);
                resolve(result);
            } catch (err) {
                reject(new Error(`Failed to parse JSON: ${err instanceof Error ? err.message : 'Unknown error'}`));
            }
        });
    });
}

function calculateGrade(stats : PerformanceResult['stats'], mods: string[]) {
    const totalHits = stats.great + stats.ok + stats.meh + stats.miss;
    // Perfect score
    if (stats.great === totalHits) {
        // SSH if HD or FL is enabled
        if (mods.includes('HD') || mods.includes('FL')) {
            return 'SSH';
        } else {
            // SS otherwise
            return 'SS';
        }
    }

    const proportion300s = stats.great / totalHits;
    const proportion50s = stats.meh / totalHits;

    // Over 90% 300s, at most 1% 50s, and no misses
    if (proportion300s > 0.9 && proportion50s <= 0.01 && stats.miss === 0) {
        // SH if HD or FL is enabled
        if (mods.includes('HD') || mods.includes('FL')) {
            return 'SH';
        } else {
            // S otherwise
            return 'S';
        }
    }

    // A if over 80% 300s and no misses OR over 90% 300s
    if (proportion300s > 0.8 && stats.miss === 0 || proportion300s > 0.9) {
        return 'A';
    }

    // B if over 70% 300s and no misses OR over 80% 300s
    if (proportion300s > 0.7 && stats.miss === 0 || proportion300s > 0.8) {
        return 'B';
    }

    // C if over 60% 300s
    if (proportion300s > 0.6) {
        return 'C';
    }

    // Anything else is a D
    return 'D';
}