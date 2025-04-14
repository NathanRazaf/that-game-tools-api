export interface OsuScoreParams {
    beatmapId: number;
    mods: string[];
    accPercent?: number;
    combo?: number;
    nmiss?: number;
    sliderTailMiss?: number;
    largeTickMiss?: number;
    n50?: number;
    n100?: number;
}

export interface TaikoScoreParams {
    beatmapId: number;
    mods: string[];
    accPercent?: number;
    combo?: number;
    nmiss?: number;
    n100?: number;
}

export interface CatchScoreParams {
    beatmapId: number;
    mods: string[];
    accPercent?: number;
    combo?: number;
    nmiss?: number;
    tinyDroplets?: number;
    droplets?: number;
}

export interface ManiaScoreParams {
    beatmapId: number;
    mods: string[];
    n300?: number;
    n100?: number;
    n50?: number;
    nmiss?: number;
}

export interface PerformanceResult {
    beatmap_id: number;
    pp: number;
    stats: {
        great: number;
        ok: number;
        meh: number;
        miss: number;
    };
    grade: string;
    star_rating: number;
    combo: number;
    accuracy: number;
}