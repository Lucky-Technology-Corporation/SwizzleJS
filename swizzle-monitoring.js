const { v4: uuidv4 } = require('uuid');
const { db } = require('./swizzle-db');
const { AsyncLocalStorage } = require('async_hooks');
require('dotenv').config();

const asyncLocalStorage = new AsyncLocalStorage();
const oldConsole = global.console;

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

function createStructuredLog(args, reqId, level) {
    const log = {
        text: args.join(' '),
        timestamp: new Date().getTime(),
        request_id: reqId,
        level: level,
    }
    return JSON.stringify(log)
}

const saveLogsAsync = async (logs, reqId) => {
    const analytics = db.collection('_swizzle_analytics');
    return analytics.updateOne(
        { traceId: reqId },
        { $set: { logs } },
        { upsert: true }
    );
};

const requestSaver = (req, res, next) => {
    req.headers['x-injected-trace-id'] = uuidv4();
    req.id = req.headers['x-injected-trace-id'];
    req.start = new Date().getTime();
    const requestLogs = [];

    asyncLocalStorage.run({ logs: requestLogs, id: req.id }, () => {
        next();
    });

    res.on('finish', async () => {
        await saveAnalyticsAsync(req, res, next);
        await saveLogsAsync(requestLogs, req.id);
    });
};


global.console = {
    log: function (...args) {
        const { logs, id } = asyncLocalStorage.getStore() || {};
        if (logs && id) {
            const logMessage = createStructuredLog(args, id, "log");
            logs.push(logMessage);
            oldConsole.log(logMessage);
        }
    },
    info: function (...args) {
        const { logs, id } = asyncLocalStorage.getStore() || {};
        if (logs && id) {
            const logMessage = createStructuredLog(args, id, "info");
            logs.push(logMessage);
            oldConsole.info(logMessage);
        }
    },
    warn: function (...args) {
        const { logs, id } = asyncLocalStorage.getStore() || {};
        if (logs && id) {
            const logMessage = createStructuredLog(args, id, "warn");
            logs.push(logMessage);
            oldConsole.warn(logMessage);
        }
    },
    error: function (...args) {
        const { logs, id } = asyncLocalStorage.getStore() || {};
        if (logs && id) {
            const logMessage = createStructuredLog(args, id, "error");
            logs.push(logMessage);
            oldConsole.error(logMessage);
        }
    }
};

module.exports = requestSaver;
