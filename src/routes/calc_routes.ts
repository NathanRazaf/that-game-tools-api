import {Type} from "@sinclair/typebox";
import {calculatePerformance, getScoreDetails} from "../services/performance";
import {FastifyInstance} from "fastify";
import path from 'path';



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
async function calcNewScore(request: any, reply : any) {
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

        const parentDir = path.resolve(__dirname, '..');
        const result = await calculatePerformance(scoreParams, parentDir);
        reply.send(result);
    } catch (error) {
        reply.status(500).send({ error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
}


interface MyFastifyInstance extends FastifyInstance {}
export default async function calcRoutes(server: MyFastifyInstance) {
    server.post('/calc/new_score', { schema: calculateSchema }, calcNewScore);
}