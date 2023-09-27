const { v4: uuidv4 } = require('uuid');
const { db } = require('./swizzle-db');
const { AsyncLocalStorage } = require('async_hooks');
require('dotenv').config();

const asyncLocalStorage = new AsyncLocalStorage();

const saveAnalyticsAsync = async (req, res, next) => {
    const traceId = req.headers['x-injected-trace-id'];
    const environment = process.env.SWIZZLE_ENV || "test";
    const userId = req.user ? req.user.userId : null;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const url = req.url;
    const method = req.method;
    const userAgent = req.headers['user-agent'];
    const headers = req.headers;
    const createdAt = new Date();
    const responseCode = res.statusCode;
    const request = {
        "query": req.query,
        "body": req.body,
    }
    const response = {
        "body": res.body,
    }
    const timeTaken = new Date().getTime() - req.start;

    const analytics = db.collection('_swizzle_analytics');
    return analytics.insertOne({ traceId, userId, ip, url, method, userAgent, createdAt, environment, responseCode, request, response, timeTaken, headers });
};

const requestSaver = (req, res, next) => {
    req.headers['x-injected-trace-id'] = uuidv4();
    req.id = req.headers['x-injected-trace-id'];
    req.start = new Date().getTime();
    
    asyncLocalStorage.run(req.id, () => {
        next();
    });

    res.on('finish', () => {
        saveAnalyticsAsync(req, res, next);
    });
};

function createStructuredLog(args, reqId) {
    const log = {
        text: args.join(' '),
        timestamp: new Date().getTime(),
        request_id: reqId,
    }
    return JSON.stringify(log)
}

const oldConsole = global.console;
global.console = {
    log: function (...args) {
        const reqId = asyncLocalStorage.getStore();
        const logMessage = createStructuredLog(args, reqId);
        oldConsole.log(logMessage);
    },
    info: function (...args) {
        const reqId = asyncLocalStorage.getStore();
        const logMessage = createStructuredLog(args, reqId);
        oldConsole.info(logMessage);
    },
    warn: function (...args) {
        const reqId = asyncLocalStorage.getStore();
        const logMessage = createStructuredLog(args, reqId);
        oldConsole.warn(logMessage);
    },
    error: function (...args) {
        const reqId = asyncLocalStorage.getStore();
        const logMessage = createStructuredLog(args, reqId);
        oldConsole.error(logMessage);
    }
};

module.exports = requestSaver;
