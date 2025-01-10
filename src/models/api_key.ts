import mongoose from "mongoose";

const apiKeySchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    owner: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastUsed: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

const ApiKeyModel = mongoose.model('ApiKey', apiKeySchema, 'api-keys');

export default ApiKeyModel;