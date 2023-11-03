"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UID = exports.connectDB = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const mongodb_1 = require("mongodb");
dotenv_1.default.config();
let _db = null;
let connectionPromise = null;
const connectDB = async () => {
    if (_db) {
        return _db;
    }
    if (connectionPromise) {
        return connectionPromise;
    }
    connectionPromise = (async () => {
        try {
            while (typeof process.env.SWIZZLE_MONGODB_CONN_STRING === 'undefined') {
                console.log('Waiting for server to initialize...');
                await sleep(500);
            }
            const client = await mongodb_1.MongoClient.connect(process.env.SWIZZLE_MONGODB_CONN_STRING, {
                tls: true,
                tlsInsecure: true,
            });
            _db = client.db("main");
            console.log('Database connected');
            return _db;
        }
        catch (err) {
            console.error(err.message);
            process.exit(1);
        }
    })();
    return connectionPromise;
};
exports.connectDB = connectDB;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const UID = (user) => {
    if (!user || !user.userId || !user._id) {
        return null;
    }
    if (typeof user === 'string') {
        return new mongodb_1.ObjectId(user);
    }
    if (user._id instanceof mongodb_1.ObjectId) {
        return user._id;
    }
    return new mongodb_1.ObjectId(user.userId);
};
exports.UID = UID;
