import {getPPFromRank, getRankFromPP} from "../services/pp_rank_converter";

async function getPPFromRankRoute(request: any, reply: any) {
    try {
        const rank = request.query.rank;
        const mode = request.query.mode;
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

export default async function converterRoutes(server: any) {
    server.get('/convert/pp', getPPFromRankRoute);
    server.get('/convert/rank', getRankFromPPRoute);
}