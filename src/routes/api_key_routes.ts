import { Type } from "@sinclair/typebox";
import ApiKeyModel from "../models/api_key";

function generateApiKey(): string {
    return Buffer.from(Math.random().toString(36) + Date.now().toString())
        .toString('base64')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 32);
}

// Define response schemas
const ApiKeyResponseSchema = Type.Object({
    key: Type.String({ description: 'API key value' }),
    owner: Type.String({ description: 'Owner of the API key' }),
    createdAt: Type.String({ description: 'Date when the API key was created', format: 'date-time' })
}, { description: 'API key details' });

const ApiKeyListItemSchema = Type.Object({
    owner: Type.String({ description: 'Owner of the API key' }),
    isActive: Type.Boolean({ description: 'Whether the API key is active' }),
    createdAt: Type.String({ description: 'Date when the API key was created', format: 'date-time' }),
    lastUsed: Type.Optional(Type.String({ description: 'Date when the API key was last used', format: 'date-time' }))
}, { description: 'API key list item' });

const MessageResponseSchema = Type.Object({
    message: Type.String({ description: 'Response message' })
}, { description: 'Success message response' });

const ErrorResponseSchema = Type.Object({
    error: Type.String({ description: 'Error message' })
}, { description: 'Error response' });

// Define route schemas
const createApiKeySchema = {
    description: 'Create a new API key for a specified owner',
    tags: ['api-keys'],
    body: Type.Object({
        owner: Type.String({ description: 'Owner of the API key' })
    }, { description: 'API key creation request' }),
    response: {
        200: ApiKeyResponseSchema,
        201: ApiKeyResponseSchema,
        500: ErrorResponseSchema
    }
};

const getKeysListSchema = {
    description: 'Get a list of all API keys (admin only)',
    tags: ['api-keys'],
    headers: Type.Object({
        'x-api-key': Type.String({ description: 'Admin API key for authentication' })
    }),
    response: {
        200: Type.Array(ApiKeyListItemSchema, { description: 'List of API keys' }),
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema
    }
};

const deleteKeySchema = {
    description: 'Deactivate an API key (admin only)',
    tags: ['api-keys'],
    headers: Type.Object({
        'x-api-key': Type.String({ description: 'Admin API key for authentication' })
    }),
    params: Type.Object({
        key: Type.String({ description: 'API key to deactivate' })
    }),
    response: {
        200: MessageResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
    }
};

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
    server.get('/api/keys', { schema: getKeysListSchema }, getKeysList);
    server.delete('/api/keys/:key', { schema: deleteKeySchema }, deleteKey);
}