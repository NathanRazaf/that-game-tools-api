import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import {
    OsuScoreParams,
    PerformanceResult,
    TaikoScoreParams,
    CatchScoreParams,
    ManiaScoreParams
} from '../types/score';
import getAccessToken from "../token";
import axios from "axios";

interface SimulateParams {
    mode: 'osu' | 'taiko' | 'catch' | 'mania';
    scoreParams: OsuScoreParams | TaikoScoreParams | CatchScoreParams | ManiaScoreParams;
}

async function simulatePerformance({ mode, scoreParams }: SimulateParams, dir: string): Promise<PerformanceResult> {
    const { beatmapId, mods, ...restParams } = scoreParams;
    const executablePath = path.join(dir, 'perfcalc', 'PerformanceCalculator');
    const modsExecArray = mods.flatMap((mod) => ['-m', mod.toUpperCase()]);

    let execArray = ['simulate', mode, beatmapId.toString()];

    const paramMap: Record<string, string> = {
        combo: '-c',
        nmiss: '-X',
        sliderTailMiss: '-S',
        largeTickMiss: '-L',
        accPercent: '-a',
        n300: '--greats',
        n50: '-M',
        n100: '-G',
        tinyDroplets: '-T',
        droplets: '-D',
        score: '-s'
    };

    Object.entries(restParams).forEach(([key, value]) => {
        if (value !== undefined && paramMap[key]) {
            execArray.push(paramMap[key], value.toString());
        }
    });

    execArray = [...execArray, ...modsExecArray, '-j'];

    console.log(`Executing: ${executablePath} ${execArray.join(' ')}`);

    return new Promise((resolve, reject) => {
        execFile(executablePath, execArray, (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }

            try {
                const lines = stdout.split('\n');
                console.log(lines);
                if (lines[0].includes('Downloading')) {
                    lines.shift();
                }
                const jsonOutput = JSON.parse(lines.join('\n'));

                deleteCacheFile(beatmapId, dir);

                const result: PerformanceResult = {
                    beatmap_id: beatmapId,
                    pp: parseFloat(jsonOutput.performance_attributes.pp.toFixed(3)),
                    stats: {
                        great: jsonOutput.score.statistics.great || 0,
                        ok: jsonOutput.score.statistics.ok || 0,
                        meh: jsonOutput.score.statistics.meh || 0,
                        miss: jsonOutput.score.statistics.miss || 0
                    },
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

export async function simulateOsuPerformance(scoreParams: OsuScoreParams, dir: string): Promise<PerformanceResult> {
    console.log("osu!");
    return simulatePerformance({ mode: 'osu', scoreParams }, dir);
}

export async function simulateTaikoPerformance(scoreParams: TaikoScoreParams, dir: string): Promise<PerformanceResult> {
    console.log("taiko!");
    return simulatePerformance({ mode: 'taiko', scoreParams }, dir);
}

export async function simulateCatchPerformance(scoreParams: CatchScoreParams, dir: string): Promise<PerformanceResult> {
    console.log("catch!");
    return simulatePerformance({ mode: 'catch', scoreParams }, dir);
}

export async function simulateManiaPerformance(scoreParams: ManiaScoreParams, dir: string): Promise<PerformanceResult> {
    console.log("mania!");
    return simulatePerformance({ mode: 'mania', scoreParams }, dir);
}

export async function getScoreDetails(scoreId: number): Promise<PerformanceResult> {
    try {
        const token = await getAccessToken();
        const response = await axios.get(`https://osu.ppy.sh/api/v2/scores/${scoreId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "x-api-version": 20220705
            }
        });
        const data = response.data;

        return {
            beatmap_id: data.beatmap_id,
            pp: data.pp,
            stats: {
                great: data.statistics.great || 0,
                ok: data.statistics.ok || 0,
                meh: data.statistics.meh || 0,
                miss: data.statistics.miss || 0
            },
            grade: data.rank,
            star_rating: data.beatmap.difficulty_rating,
            combo: data.max_combo,
            accuracy: data.accuracy * 100,
        };
    } catch (error) {
        throw error;
    }
}

async function deleteCacheFile(beatmapId: number, dir: string): Promise<void> {
    const cacheFilePath = path.join(dir, './cache', `${beatmapId}.osu`);
    console.log(`Deleting cache file: ${cacheFilePath}`);
    if (fs.existsSync(cacheFilePath)) {
        fs.unlinkSync(cacheFilePath);
    }
}

function calculateGrade(stats: PerformanceResult['stats'], mods: string[]): string {
    const totalHits = (stats.great || 0) + (stats.ok || 0) + (stats.meh || 0) + (stats.miss || 0);
    if ((stats.great || 0) === totalHits) {
        if (mods.includes('HD') || mods.includes('FL')) {
            return 'SSH';
        } else {
            return 'SS';
        }
    }

    const proportion300s = (stats.great || 0) / totalHits;
    const proportion50s = (stats.meh || 0) / totalHits;

    if (proportion300s > 0.9 && proportion50s <= 0.01 && (stats.miss || 0) === 0) {
        if (mods.includes('HD') || mods.includes('FL')) {
            return 'SH';
        } else {
            return 'S';
        }
    }

    if (proportion300s > 0.8 && (stats.miss || 0) === 0 || proportion300s > 0.9) {
        return 'A';
    }

    if (proportion300s > 0.7 && (stats.miss || 0) === 0 || proportion300s > 0.8) {
        return 'B';
    }

    if (proportion300s > 0.6) {
        return 'C';
    }

    return 'D';
}