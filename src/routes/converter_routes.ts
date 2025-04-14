import { Type } from "@sinclair/typebox";
import { getPPFromRank, getRankFromPP } from "../services/pp_rank_converter";

async function getPPFromRankRoute(request: any, reply: any) {
    try {
        const rank = request.query.rank;
        const mode = request.query.mode; // 0 = osu!, 1 = Taiko, 2 = CtB, 3 = osu!mania
        const response = await getPPFromRank(rank, mode);
        reply.send({ pp: response });
    } catch (error) {
        reply.status(500).send({ error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
}

async function getRankFromPPRoute(request: any, reply: any) {
    try {
        const pp = request.query.pp;
        const mode = request.query.mode;
        const response = await getRankFromPP(pp, mode);
        reply.send({ rank: response });
    } catch (error) {
        reply.status(500).send({ error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
}

// Define response schemas
const PPResponseSchema = Type.Object({
    pp: Type.Number({ description: 'PP value for the given rank' })
}, { description: 'PP calculation result' });

const RankResponseSchema = Type.Object({
    rank: Type.Integer({ description: 'Global rank for the given PP value' })
}, { description: 'Rank calculation result' });

const ErrorResponseSchema = Type.Object({
    error: Type.String({ description: 'Error message' })
}, { description: 'Error response' });

// Define route schemas
const toPPSchema = {
    description: 'Convert player rank to PP value',
    tags: ['converter'],
    headers: Type.Object({
        'x-api-key': Type.String({ description: 'API key for authentication' })
    }),
    querystring: Type.Object({
        rank: Type.Integer({ description: 'Player global rank' }),
        mode: Type.Optional(Type.Integer({
            description: 'Game mode (0 = osu!, 1 = Taiko, 2 = CtB, 3 = osu!mania)',
            enum: [0, 1, 2, 3],
            default: 0
        }))
    }),
    response: {
        200: PPResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema
    }
};

const toRankSchema = {
    description: 'Convert PP value to player rank',
    tags: ['converter'],
    headers: Type.Object({
        'x-api-key': Type.String({ description: 'API key for authentication' })
    }),
    querystring: Type.Object({
        pp: Type.Number({ description: 'Performance points (PP) value' }),
        mode: Type.Optional(Type.Integer({
            description: 'Game mode (0 = osu!, 1 = Taiko, 2 = CtB, 3 = osu!mania)',
            enum: [0, 1, 2, 3],
            default: 0
        }))
    }),
    response: {
        200: RankResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema
    }
};

export default async function converterRoutes(server: any) {
    server.get('/convert/to-pp', { schema: toPPSchema }, getPPFromRankRoute);
    server.get('/convert/to-rank', { schema: toRankSchema }, getRankFromPPRoute);
}