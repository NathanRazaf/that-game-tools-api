import axios from 'axios';
const TOKEN_URL = 'https://osu.ppy.sh/oauth/token';

let cachedToken : string | undefined;
let tokenExpiration : number | undefined;

async function getAccessToken() {
    const currentTime = Date.now();

    // Check if token is still valid
    if (cachedToken !== undefined && tokenExpiration !== undefined && currentTime < tokenExpiration) {
        return cachedToken;
    }

    // Fetch a new token if expired or doesn't exist
    try {
        const response = await axios.post(TOKEN_URL, {
            client_id: process.env.OSU_CLIENT_ID,
            client_secret: process.env.OSU_CLIENT_SECRET,
            grant_type: 'client_credentials',
            scope: 'public'
        });

        cachedToken = response.data.access_token;
        tokenExpiration = currentTime + 86400 * 1000; // Set expiration to 24 hours (in milliseconds)

        return cachedToken;
    } catch (error) {
        console.error('Error fetching access token:', error);
        throw error;
    }
}

export default getAccessToken;
