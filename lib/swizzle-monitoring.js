"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsMiddleware = void 0;
const async_hooks_1 = require("async_hooks");
const dotenv_1 = __importDefault(require("dotenv"));
const uuid_1 = require("uuid");
dotenv_1.default.config();
const asyncLocalStorage = new async_hooks_1.AsyncLocalStorage();
const saveAnalyticsAsync = async (db, req, res, next) => {
    const referer = req.headers['referer'] || req.headers['referrer'];
    if (referer == "https://swizzle-internal.com/" || referer == "https://app.swizzle.co/" || referer == "http://localhost:8080/") {
        if (req.originalUrl.includes("/swizzle/storage")) {
            return;
        }
    }
    const traceId = req.headers['x-injected-trace-id'];
    const environment = process.env.SWIZZLE_ENV || "test";
    const userId = req.user ? req.user.userId : null;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const url = req.originalUrl || req.url;
    const method = req.method;
    const userAgent = req.headers['user-agent'];
    const headers = req.headers;
    const createdAt = new Date();
    const responseCode = res.statusCode;
    const request = {
        "query": req.query,
        "body": req.body,
        "headers": req.headers,
    };
    const response = {
        "body": res.body,
    };
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
    };
    return JSON.stringify(log);
}
const saveLogsAsync = async (db, logs, reqId) => {
    const analytics = db.collection('_swizzle_analytics');
    return analytics.updateOne({ traceId: reqId }, { $set: { logs } }, { upsert: true });
};
const analyticsMiddleware = (db) => (req, res, next) => {
    req.headers['x-injected-trace-id'] = (0, uuid_1.v4)();
    req.id = req.headers['x-injected-trace-id'];
    req.start = new Date().getTime();
    const requestLogs = [];
    asyncLocalStorage.run({ logs: requestLogs, id: req.id }, () => {
        next();
    });
    res.on('finish', async () => {
        try {
            await saveAnalyticsAsync(db, req, res, next);
            await saveLogsAsync(db, requestLogs, req.id);
        }
        catch (err) {
            console.error('Error saving analytics or logs:', err);
        }
    });
};
exports.analyticsMiddleware = analyticsMiddleware;
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
global.console.log = (...args) => {
    const store = asyncLocalStorage.getStore();
    if (!store) {
        originalConsoleLog.apply(console, args);
        return;
    }
    const { logs, id } = store;
    if (logs && id) {
        const logMessage = createStructuredLog(args, id, "log");
        logs.push(logMessage);
        originalConsoleLog.call(console, logMessage);
    }
    else {
        originalConsoleLog.apply(console, args);
    }
};
global.console.info = (...args) => {
    const store = asyncLocalStorage.getStore();
    if (!store) {
        originalConsoleInfo.apply(console, args);
        return;
    }
    const { logs, id } = store;
    if (logs && id) {
        const logMessage = createStructuredLog(args, id, "info");
        logs.push(logMessage);
        originalConsoleInfo.call(console, logMessage);
    }
    else {
        originalConsoleInfo.apply(console, args);
    }
};
global.console.warn = (...args) => {
    const store = asyncLocalStorage.getStore();
    if (!store) {
        originalConsoleWarn.apply(console, args);
        return;
    }
    const { logs, id } = store;
    if (logs && id) {
        const logMessage = createStructuredLog(args, id, "warn");
        logs.push(logMessage);
        originalConsoleWarn.call(console, logMessage);
    }
    else {
        originalConsoleWarn.apply(console, args);
    }
};
global.console.error = (...args) => {
    const store = asyncLocalStorage.getStore();
    if (!store) {
        originalConsoleError.apply(console, args);
        return;
    }
    const { logs, id } = store;
    if (logs && id) {
        const logMessage = createStructuredLog(args, id, "error");
        logs.push(logMessage);
        originalConsoleError.call(console, logMessage);
    }
    else {
        originalConsoleError.apply(console, args);
    }
};
