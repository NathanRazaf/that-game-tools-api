import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import simulateRoutes from "./routes/simulator_routes";
import fastifyRateLimit from "@fastify/rate-limit";
import { Redis } from "ioredis";
import dotenv from 'dotenv';
import * as mongoose from "mongoose";
import ApiKeyModel from "./models/api_key";
import apiKeyRoutes from "./routes/api_key_routes";
import converterRoutes from "./routes/converter_routes";

dotenv.config();

// Create Fastify instance
const server = Fastify({
    logger: true
});

// Setup Redis for rate limiting
const redis = new Redis(process.env.REDIS_PUBLIC_URL || 'redis://redis:6379');

// Register Swagger
async function setupSwagger() {
    await server.register(fastifySwagger, {
        swagger: {
            info: {
                title: 'OSU Performance Calculator API',
                description: 'API for calculating performance points (PP) in OSU!',
                version: '1.0.0'
            },
            externalDocs: {
                url: 'https://github.com/NathanRazaf/that-game-tools-api',
                description: 'Find more info here'
            },
            host: process.env.API_HOST || 'localhost:3000',
            schemes: ['http', 'https'],
            consumes: ['application/json'],
            produces: ['application/json'],
            securityDefinitions: {
                apiKey: {
                    type: 'apiKey',
                    name: 'x-api-key',
                    in: 'header'
                }
            },
            security: [{ apiKey: [] }],
            tags: [
                { name: 'simulator', description: 'Performance simulation endpoints' },
                { name: 'converter', description: 'PP and rank conversion endpoints' },
                { name: 'api-keys', description: 'API key management endpoints' }
            ]
        }
    });

    await server.register(fastifySwaggerUi, {
        routePrefix: '/documentation',
        uiConfig: {
            docExpansion: 'list',
            deepLinking: false
        },
        uiHooks: {
            onRequest: function (request, reply, next) { next(); },
            preHandler: function (request, reply, next) { next(); }
        },
        staticCSP: true,
        transformStaticCSP: (header) => header
    });
}

// Configure rate limiting
async function setupRateLimit() {
    await server.register(fastifyRateLimit, {
        max: 100,
        timeWindow: '15 minutes',
        redis: redis,
        keyGenerator: (req) => {
            return req.headers['x-api-key'] as string;
        },
        errorResponseBuilder: () => ({
            statusCode: 429,
            error: 'Too Many Requests',
            message: 'Rate limit exceeded, please try again later'
        })
    });
}

// CORS
server.register(cors, {
    origin: true
});

// API key verification hook
server.addHook('preHandler', async (request: any, reply: any) => {
    // Skip documentation routes
    if (request.routeOptions.url.startsWith('/documentation')) {
        return;
    }

    // First, check if this is an admin route
    const adminRoutes = [
        { url: '/api/keys', method: 'GET' },
        { url: '/api/keys/:key', method: 'DELETE' }
    ];

    // Check if current request is an admin route
    const isAdminRoute = adminRoutes.some(route =>
        route.url === request.routeOptions.url &&
        route.method === request.method
    );

    // Skip all auth for POST /api/keys (key creation)
    if (request.routeOptions.url === '/api/keys' && request.method === 'POST') {
        return;
    }

    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
        reply.code(401).send({ error: 'API key is required' });
        return;
    }

    // For admin routes, check if key matches ADMIN_KEY
    if (isAdminRoute) {
        if (apiKey !== process.env.ADMIN_KEY) {
            reply.code(403).send({ error: 'Admin access required' });
            return;
        }
        request.isAdmin = true;
        return; // Skip regular API key check for admin routes
    }

    // For non-admin routes, verify regular API key
    try {
        const keyDetails = await ApiKeyModel.findOne({
            key: apiKey,
            isActive: true
        });

        if (!keyDetails) {
            reply.code(403).send({ error: 'Invalid or inactive API key' });
            return;
        }

        // Update last used timestamp
        await ApiKeyModel.updateOne(
            { key: apiKey },
            { $set: { lastUsed: new Date() }}
        );

        //@ts-ignore
        request.apiKeyDetails = keyDetails;
    } catch (error) {
        request.log.error(error);
        reply.code(500).send({ error: 'Error verifying API key' });
    }
});

// Connect to MongoDB
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string, {
            dbName: 'that-game-tools-db'
        });
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

// Add a basic API info route
server.get('/', async () => {
    return {
        name: 'OSU Performance Calculator API',
        version: '1.0.0',
        documentation: '/documentation'
    };
});

// Start server
async function start() {
    try {
        await connectDB();
        await setupSwagger();
        await setupRateLimit();

        // Register routes after Swagger is set up
        server.register(simulateRoutes);
        server.register(apiKeyRoutes);
        server.register(converterRoutes);

        await server.listen({ port: parseInt(process.env.PORT || '3000'), host: '0.0.0.0' });

        const address = server.server.address();
        server.log.info(`Server listening on ${address}`);
        server.log.info('Documentation available at /documentation');
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}

// Handle shutdown
process.on('SIGINT', async () => {
    await server.close();
    await redis.quit();
    process.exit(0);
});

start();