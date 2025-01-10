export interface ScoreParams {
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

export interface Mod {
    acronym: string;
}

export interface PerformanceResult {
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