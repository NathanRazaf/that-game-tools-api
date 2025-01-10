import ApiKeyModel from "../models/api_key";

function generateApiKey(): string {
    return Buffer.from(Math.random().toString(36) + Date.now().toString())
        .toString('base64')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 32);
}

const createApiKeySchema = {
    body: {
        type: 'object',
        required: ['owner'],
        properties: {
            owner: { type: 'string' }
        }
    }
}
async function createApiKey(request: any, reply: any) {
    const { owner } = request.body;
    const key = generateApiKey();

    try {
        // Check if owner already has an API key
        const existingKey = await ApiKeyModel.findOne({ owner });

        // If owner already has a key, return it
        if (existingKey) {
            return reply.code(200).send({
                key: existingKey.key,
                owner: existingKey.owner,
                createdAt: existingKey.createdAt
            });
        }

        // Create new API key
        const apiKey = new ApiKeyModel({
            key,
            owner,
            isActive: true
        });

        await apiKey.save();

        reply.code(201).send({
            key,
            owner,
            createdAt: apiKey.createdAt
        });
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Error creating API key' });
    }
}

async function getKeysList(request: any, reply: any) {
    try {
        return await ApiKeyModel.find({}, {key: 0});
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Error fetching API keys' });
    }
}

async function deleteKey(request: any, reply: any) {
    const { key } = request.params as { key: string };

    try {
        const result = await ApiKeyModel.updateOne(
            { key },
            { $set: { isActive: false }}
        );

        if (result.matchedCount === 0) {
            return reply.code(404).send({ error: 'API key not found' });
        }

        return { message: 'API key deactivated successfully' };
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ error: 'Error deactivating API key' });
    }
}

export default async function apiKeyRoutes(server: any) {
    server.post('/api/keys', { schema: createApiKeySchema }, createApiKey);
    server.get('/api/keys', getKeysList);
    server.delete('/api/keys/:key', deleteKey);
}