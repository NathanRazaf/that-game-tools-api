import { Type } from "@sinclair/typebox";
import {
    simulateOsuPerformance,
    simulateTaikoPerformance,
    simulateCatchPerformance,
    simulateManiaPerformance,
    getScoreDetails
} from "../services/simulator";
import { FastifyInstance } from "fastify";
import path from 'path';
import {
    OsuScoreParams,
    TaikoScoreParams,
    CatchScoreParams,
    ManiaScoreParams
} from '../types/score';

const PerformanceResultSchema = Type.Object({
    beatmap_id: Type.Number(),
    pp: Type.Number(),
    stats: Type.Object({
        great: Type.Number(),
        ok: Type.Number(),
        meh: Type.Number(),
        miss: Type.Number()
    }),
    grade: Type.String(),
    star_rating: Type.Number(),
    combo: Type.Number(),
    accuracy: Type.Number()
});

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

// Register route schema
const osuCalcSchema = {
    body: Type.Object({
        scoreId: Type.Optional(Type.Number()),
        beatmapId: Type.Optional(Type.Number()),
        mods: Type.Optional(Type.Array(Type.String())),
        combo: Type.Optional(Type.Number()),
        accPercent: Type.Optional(Type.Number()),
        n100: Type.Optional(Type.Number()),
        n50: Type.Optional(Type.Number()),
        nmiss: Type.Optional(Type.Number()),
        sliderTailMiss: Type.Optional(Type.Number()),
        largeTickMiss: Type.Optional(Type.Number())
    }),
    response: {
        200: PerformanceResultSchema
    }
};

const taikoCalcSchema = {
    body: Type.Object({
        scoreId: Type.Optional(Type.Number()),
        beatmapId: Type.Optional(Type.Number()),
        mods: Type.Optional(Type.Array(Type.String())),
        combo: Type.Optional(Type.Number()),
        accPercent: Type.Optional(Type.Number()),
        n100: Type.Optional(Type.Number()),
        nmiss: Type.Optional(Type.Number())
    }),
    response: {
        200: PerformanceResultSchema
    }
};

const catchCalcSchema = {
    body: Type.Object({
        scoreId: Type.Optional(Type.Number()),
        beatmapId: Type.Optional(Type.Number()),
        mods: Type.Optional(Type.Array(Type.String())),
        combo: Type.Optional(Type.Number()),
        accPercent: Type.Optional(Type.Number()),
        droplets: Type.Optional(Type.Number()),
        tinyDroplets: Type.Optional(Type.Number()),
        nmiss: Type.Optional(Type.Number()),
    }),
    response: {
        200: PerformanceResultSchema
    }
};

const maniaCalcSchema = taikoCalcSchema

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

        const parentDir = path.resolve(__dirname, '..');
        const result = await simulateOsuPerformance(scoreParams, parentDir);
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

        const parentDir = path.resolve(__dirname, '..');
        const result = await simulateTaikoPerformance(scoreParams, parentDir);
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

        const parentDir = path.resolve(__dirname, '..');
        const result = await simulateCatchPerformance(scoreParams, parentDir);
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
            n300: request.body.n300,
            n100: request.body.n100,
            n50: request.body.n50,
            nmiss: request.body.nmiss
        };

        const parentDir = path.resolve(__dirname, '..');
        const result = await simulateManiaPerformance(scoreParams, parentDir);
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