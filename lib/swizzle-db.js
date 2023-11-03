"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbProxy = exports.init = void 0;
const swizzle_db_connection_1 = require("./swizzle-db-connection");
let _db = null;
const init = async () => {
    try {
        if (_db) {
            return _db;
        }
        _db = await (0, swizzle_db_connection_1.connectDB)();
        return _db;
    }
    catch (err) {
        console.error('Failed to connect to DB:', err);
    }
};
exports.init = init;
(async () => {
    try {
        await (0, exports.init)();
    }
    catch (err) {
        console.error(err);
    }
})();
exports.dbProxy = new Proxy({}, {
    get: function (target, name) {
        if (!_db) {
            throw new Error('DB not initialized');
        }
        return _db[name];
    }
});
