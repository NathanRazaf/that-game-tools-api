import axios from "axios";

const PP_API_URL = 'https://osudaily.net/api/pp.php';

const createRequest = (url: string, params: Record<string, any>) => {
    return axios.get(url, {
        params: {
            k: process.env.OSU_DAILY_API_KEY,
            ...params
        }
    });
};

export async function getPPFromRank(rank: number, mode: number) {
    try {
        const response = await createRequest(PP_API_URL, { t: 'rank', v: rank, m: mode });
        return response.data.pp;
    } catch (error) {
        console.error('Error fetching pp:', error);
        throw error;
    }
}

export async function getRankFromPP(pp: number, mode: number) {
    try {
        const response = await createRequest(PP_API_URL, { t: 'pp', v: pp, m: mode });
        return response.data.rank;
    } catch (error) {
        console.error('Error fetching rank:', error);
        throw error;
    }
}