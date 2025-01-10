import Fastify from 'fastify';
import cors from '@fastify/cors';
import {Type} from '@sinclair/typebox';
import {calculatePerformance} from './services/performance';
import getAccessToken from "./token";
import axios from "axios";
import {Mod} from "./types/score";
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({
    logger: true
});

fastify.register(cors, {
    origin: true // Configure according to your needs
});

async function getScoreDetails(scoreId : number) {
    try {
        const token = await getAccessToken();
        const response = await axios.get(`https://osu.ppy.sh/api/v2/scores/${scoreId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "x-api-version": 20220705
            }
        })
        const data = response.data;
        const beatmapId = data.beatmap_id;
        const mods = data.mods.map((mod: Mod) => mod.acronym);
        const accPercent = data.accuracy * 100;
        const combo = data.max_combo;
        const nmiss = data.statistics.miss || 0;
        const largeTickMiss = data.statistics.large_tick_miss || 0;
        const sliderTailMiss = (data.maximum_statistics.slider_tail_hit - data.statistics.slider_tail_hit) || 0;
        return {beatmapId, mods, accPercent, combo, nmiss, sliderTailMiss, largeTickMiss};
    } catch (error) {
        throw error;
    }
}

// Register route schema
const calculateSchema = {
    body: Type.Object({
        scoreId: Type.Optional(Type.Number()),
        beatmapId: Type.Optional(Type.Number()),
        mods: Type.Optional(Type.Array(Type.String())),
        accPercent: Type.Optional(Type.Number()),
        n50: Type.Optional(Type.Number()),
        n100: Type.Optional(Type.Number()),
        combo: Type.Optional(Type.Number()),
        nmiss: Type.Optional(Type.Number()),
        sliderTailMiss: Type.Optional(Type.Number()),
        largeTickMiss: Type.Optional(Type.Number())
    })
};

fastify.post('/calculate', { schema: calculateSchema }, async (request: any, reply) => {
    try {
        let scoreParams;

        if (request.body.scoreId) {
            try {
                scoreParams = await getScoreDetails(request.body.scoreId);
            } catch (error) {
                reply.status(400).send({ error: `Failed to fetch score details: ${error instanceof Error ? error.message : 'Unknown error'}` });
                return;
            }
        } else {
            scoreParams = {
                beatmapId: request.body.beatmapId,
                mods: request.body.mods,
                accPercent: request.body.accPercent,
                n50: request.body.n50,
                n100: request.body.n100,
                combo: request.body.combo,
                nmiss: request.body.nmiss,
                sliderTailMiss: request.body.sliderTailMiss || 0,
                largeTickMiss: request.body.largeTickMiss || 0
            };
        }

        const result = await calculatePerformance(scoreParams, __dirname);
        reply.send(result);
    } catch (error) {
        reply.status(500).send({ error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
});

// Start server
try {
    fastify.listen({port: 3000, host: '0.0.0.0'}).then(r => {
        console.log(`Server listening on port ${r}`);
    });
} catch (err) {
    fastify.log.error(err);
    process.exit(1);
}