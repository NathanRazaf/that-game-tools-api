import { Type } from "@sinclair/typebox";
import {
    simulateOsuPerformance,
    simulateTaikoPerformance,
    simulateCatchPerformance,
    simulateManiaPerformance,
    getScoreDetails
} from "../services/simulator";
import { FastifyInstance } from "fastify";
import {
    OsuScoreParams,
    TaikoScoreParams,
    CatchScoreParams,
    ManiaScoreParams
} from '../types/score';

const PerformanceResultSchema = Type.Object({
    beatmap_id: Type.Number({ description: 'ID of the beatmap' }),
    pp: Type.Number({ description: 'Performance points value' }),
    stats: Type.Object({
        great: Type.Number({ description: 'Number of great hits' }),
        ok: Type.Number({ description: 'Number of ok hits' }),
        meh: Type.Number({ description: 'Number of meh hits' }),
        miss: Type.Number({ description: 'Number of misses' })
    }, { description: 'Hit statistics' }),
    grade: Type.String({ description: 'Score grade (SS, S, A, B, C, D)' }),
    star_rating: Type.Number({ description: 'Star rating of the beatmap' }),
    combo: Type.Number({ description: 'Maximum combo achieved' }),
    accuracy: Type.Number({ description: 'Accuracy percentage' })
}, { description: 'Performance calculation result' });

const ErrorResponseSchema = Type.Object({
    error: Type.String({ description: 'Error message' })
}, { description: 'Error response' });

async function returnsExistingScore(request: any, reply: any) {
    if (request.body.scoreId) {
        try {
            const result = await getScoreDetails(request.body.scoreId);
            if (!result) {
                reply.status(404).send({ error: 'Score not found' });
                return true;
            }

            reply.send(result);
            return true;
        } catch (error) {
            reply.status(400).send(
                { error: `Failed to fetch score details: ${error instanceof Error ?
                        error.message : 'Unknown error'}`
                });
            return true;
        }
    } else {
        return false;
    }
}

// Common headers schema for API key authentication
const AuthHeadersSchema = Type.Object({
    'x-api-key': Type.String({ description: 'API key for authentication' })
});

// Register route schema
const osuCalcSchema = {
    description: 'Calculate performance for osu! standard mode',
    tags: ['simulator'],
    headers: AuthHeadersSchema,
    body: Type.Object({
        scoreId: Type.Optional(Type.Number({ description: 'Existing score ID to retrieve' })),
        beatmapId: Type.Optional(Type.Number({ description: 'Beatmap ID to calculate performance for' })),
        mods: Type.Optional(Type.Array(Type.String(), { description: 'Array of mod strings (e.g. HD, DT, HR)' })),
        combo: Type.Optional(Type.Number({ description: 'Maximum combo achieved' })),
        accPercent: Type.Optional(Type.Number({ description: 'Accuracy percentage' })),
        n100: Type.Optional(Type.Number({ description: 'Number of 100s (good hits)' })),
        n50: Type.Optional(Type.Number({ description: 'Number of 50s (meh hits)' })),
        nmiss: Type.Optional(Type.Number({ description: 'Number of misses' })),
        sliderTailMiss: Type.Optional(Type.Number({ description: 'Number of slider tail misses' })),
        largeTickMiss: Type.Optional(Type.Number({ description: 'Number of large tick misses' }))
    }, { description: 'osu! standard score parameters' }),
    response: {
        200: PerformanceResultSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
    }
};

const taikoCalcSchema = {
    description: 'Calculate performance for Taiko mode',
    tags: ['simulator'],
    headers: AuthHeadersSchema,
    body: Type.Object({
        scoreId: Type.Optional(Type.Number({ description: 'Existing score ID to retrieve' })),
        beatmapId: Type.Optional(Type.Number({ description: 'Beatmap ID to calculate performance for' })),
        mods: Type.Optional(Type.Array(Type.String(), { description: 'Array of mod strings (e.g. HD, DT, HR)' })),
        combo: Type.Optional(Type.Number({ description: 'Maximum combo achieved' })),
        accPercent: Type.Optional(Type.Number({ description: 'Accuracy percentage' })),
        n100: Type.Optional(Type.Number({ description: 'Number of 100s (good hits)' })),
        nmiss: Type.Optional(Type.Number({ description: 'Number of misses' }))
    }, { description: 'Taiko score parameters' }),
    response: {
        200: PerformanceResultSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
    }
};

const catchCalcSchema = {
    description: 'Calculate performance for Catch the Beat mode',
    tags: ['simulator'],
    headers: AuthHeadersSchema,
    body: Type.Object({
        scoreId: Type.Optional(Type.Number({ description: 'Existing score ID to retrieve' })),
        beatmapId: Type.Optional(Type.Number({ description: 'Beatmap ID to calculate performance for' })),
        mods: Type.Optional(Type.Array(Type.String(), { description: 'Array of mod strings (e.g. HD, DT, HR)' })),
        combo: Type.Optional(Type.Number({ description: 'Maximum combo achieved' })),
        accPercent: Type.Optional(Type.Number({ description: 'Accuracy percentage' })),
        droplets: Type.Optional(Type.Number({ description: 'Number of droplets caught' })),
        tinyDroplets: Type.Optional(Type.Number({ description: 'Number of tiny droplets caught' })),
        nmiss: Type.Optional(Type.Number({ description: 'Number of misses' }))
    }, { description: 'Catch the Beat score parameters' }),
    response: {
        200: PerformanceResultSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
    }
};

const maniaCalcSchema = {
    description: 'Calculate performance for osu!mania mode',
    tags: ['simulator'],
    headers: AuthHeadersSchema,
    body: Type.Object({
        scoreId: Type.Optional(Type.Number({ description: 'Existing score ID to retrieve' })),
        beatmapId: Type.Optional(Type.Number({ description: 'Beatmap ID to calculate performance for' })),
        mods: Type.Optional(Type.Array(Type.String(), { description: 'Array of mod strings (e.g. HD, DT, HR)' })),
        accPercent: Type.Optional(Type.Number({ description: 'Accuracy percentage' })),
        n300: Type.Optional(Type.Number({ description: 'Number of 300s (perfect hits)' })),
        n100: Type.Optional(Type.Number({ description: 'Number of 100s (good hits)' })),
        n50: Type.Optional(Type.Number({ description: 'Number of 50s (meh hits)' })),
        nmiss: Type.Optional(Type.Number({ description: 'Number of misses' }))
    }, { description: 'osu!mania score parameters' }),
    response: {
        200: PerformanceResultSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
    }
};

async function calcNewOsuScore(request: any, reply: any) {
    try {
        if (await returnsExistingScore(request, reply)) {
            return;
        }

        if (!request.body.beatmapId) {
            reply.status(400).send({ error: 'Beatmap ID is required' });
            return;
        }

        const scoreParams: OsuScoreParams = {
            beatmapId: request.body.beatmapId,
            mods: request.body.mods || [],
            accPercent: request.body.accPercent,
            combo: request.body.combo,
            nmiss: request.body.nmiss,
            n50: request.body.n50,
            n100: request.body.n100,
            sliderTailMiss: request.body.sliderTailMiss,
            largeTickMiss: request.body.largeTickMiss
        };

        const result = await simulateOsuPerformance(scoreParams);
        reply.send(result);
    } catch (error) {
        reply.status(500).send(
            { error: `Unexpected error: ${error instanceof Error ?
                    error.message : 'Unknown error'}`
            });
    }
}

async function calcNewTaikoScore(request: any, reply: any) {
    try {
        if (await returnsExistingScore(request, reply)) {
            return;
        }

        if (!request.body.beatmapId) {
            reply.status(400).send({ error: 'Beatmap ID is required' });
            return;
        }

        const scoreParams: TaikoScoreParams = {
            beatmapId: request.body.beatmapId,
            mods: request.body.mods || [],
            accPercent: request.body.accPercent,
            combo: request.body.combo,
            nmiss: request.body.nmiss,
            n100: request.body.n100
        };

        const result = await simulateTaikoPerformance(scoreParams);
        reply.send(result);
    } catch (error) {
        reply.status(500).send(
            { error: `Unexpected error: ${error instanceof Error ?
                    error.message : 'Unknown error'}`
            });
    }
}

async function calcNewCatchScore(request: any, reply: any) {
    try {
        if (await returnsExistingScore(request, reply)) {
            return;
        }

        if (!request.body.beatmapId) {
            reply.status(400).send({ error: 'Beatmap ID is required' });
            return;
        }

        const scoreParams: CatchScoreParams = {
            beatmapId: request.body.beatmapId,
            mods: request.body.mods || [],
            accPercent: request.body.accPercent,
            combo: request.body.combo,
            nmiss: request.body.nmiss,
            droplets: request.body.droplets,
            tinyDroplets: request.body.tinyDroplets
        };

        const result = await simulateCatchPerformance(scoreParams);
        reply.send(result);
    } catch (error) {
        reply.status(500).send(
            { error: `Unexpected error: ${error instanceof Error ?
                    error.message : 'Unknown error'}`
            });
    }
}

async function calcNewManiaScore(request: any, reply: any) {
    try {
        if (await returnsExistingScore(request, reply)) {
            return;
        }

        if (!request.body.beatmapId) {
            reply.status(400).send({ error: 'Beatmap ID is required' });
            return;
        }

        const scoreParams: ManiaScoreParams = {
            beatmapId: request.body.beatmapId,
            mods: request.body.mods || [],
            accPercent: request.body.accPercent,
            n300: request.body.n300,
            n100: request.body.n100,
            n50: request.body.n50,
            nmiss: request.body.nmiss
        };

        const result = await simulateManiaPerformance(scoreParams);
        reply.send(result);
    } catch (error) {
        reply.status(500).send(
            { error: `Unexpected error: ${error instanceof Error ?
                    error.message : 'Unknown error'}`
            });
    }
}

export default async function simulateRoutes(server: FastifyInstance) {
    server.post('/simulate/new_score/osu', { schema: osuCalcSchema }, calcNewOsuScore);
    server.post('/simulate/new_score/taiko', { schema: taikoCalcSchema }, calcNewTaikoScore);
    server.post('/simulate/new_score/catch', { schema: catchCalcSchema }, calcNewCatchScore);
    server.post('/simulate/new_score/mania', { schema: maniaCalcSchema }, calcNewManiaScore);
}