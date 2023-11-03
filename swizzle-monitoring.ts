import { Db } from "mongodb";
const { v4: uuidv4 } = require('uuid');
const { AsyncLocalStorage } = require('async_hooks');
require('dotenv').config();

const asyncLocalStorage = new AsyncLocalStorage();

const saveAnalyticsAsync = async (db: Db, req: any, res: any, next: any) => {
    const referer = req.headers['referer'] || req.headers['referrer'];
    if(referer == "https://swizzle-internal.com/" || referer == "https://app.swizzle.co/" || referer == "http://localhost:8080/"){
        if(req.originalUrl.includes("/swizzle/storage")){
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
    }
    const response = {
        "body": res.body,
    }
    const timeTaken = new Date().getTime() - req.start;

    const analytics = db.collection('_swizzle_analytics');
    return analytics.insertOne({ traceId, userId, ip, url, method, userAgent, createdAt, environment, responseCode, request, response, timeTaken, headers });
};

function createStructuredLog(args: any, reqId: any, level: any) {
    const log = {
        text: args.join(' '),
        timestamp: new Date().getTime(),
        request_id: reqId,
        level: level,
    }
    return JSON.stringify(log)
}

const saveLogsAsync = async (db: any, logs: any, reqId: any) => {
    const analytics = db.collection('_swizzle_analytics');
    return analytics.updateOne(
        { traceId: reqId },
        { $set: { logs } },
        { upsert: true }
    );
};

const analyticsMiddleware = (db: Db) => (req: any, res: any, next: any) => {
    req.headers['x-injected-trace-id'] = uuidv4();
    req.id = req.headers['x-injected-trace-id'];
    req.start = new Date().getTime();
    const requestLogs: [string?] = [];

    asyncLocalStorage.run({ logs: requestLogs, id: req.id }, () => {
        next();
    });

    res.on('finish', async () => {
        try {
            await saveAnalyticsAsync(db, req, res, next);
            await saveLogsAsync(db, requestLogs, req.id);
        } catch (err) {
            console.error('Error saving analytics or logs:', err);
        }
    });
};

const oldConsole = global.console;

global.console.log = (...args: any[]) => {
    const { logs, id } = asyncLocalStorage.getStore() || {};
    if (logs && id) {
        const logMessage = createStructuredLog(args, id, "log");
        logs.push(logMessage);
        oldConsole.log(logMessage);
    } else {
        oldConsole.log(...args);
    }
}

global.console.info = (...args: any[]) => {
    const { logs, id } = asyncLocalStorage.getStore() || {};
    if (logs && id) {
        const logMessage = createStructuredLog(args, id, "info");
        logs.push(logMessage);
        oldConsole.info(logMessage);
    } else {
        oldConsole.info(...args);
    }
}

global.console.warn = (...args: any[]) => {
    const { logs, id } = asyncLocalStorage.getStore() || {};
    if (logs && id) {
        const logMessage = createStructuredLog(args, id, "warn");
        logs.push(logMessage);
        oldConsole.warn(logMessage);
    } else {
        oldConsole.warn(...args);
    }
},
global.console.error = (...args: any[]) => {
    const { logs, id } = asyncLocalStorage.getStore() || {};
    if (logs && id) {
        const logMessage = createStructuredLog(args, id, "error");
        logs.push(logMessage);
        oldConsole.error(logMessage);
    } else {
        oldConsole.error(...args);
    }
}


module.exports = analyticsMiddleware;
