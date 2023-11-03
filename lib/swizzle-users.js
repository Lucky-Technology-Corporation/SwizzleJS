"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = exports.editUser = exports.refreshTokens = exports.signTokens = exports.searchUsers = exports.getUser = exports.addUserIdToUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const swizzle_db_connection_1 = require("./swizzle-db-connection");
const _1 = require(".");
function addUserIdToUser(user) {
    return { ...user, userId: user._id.toString() };
}
exports.addUserIdToUser = addUserIdToUser;
async function getUser(uid) {
    const uidObject = (0, swizzle_db_connection_1.UID)(uid);
    if (!uidObject) {
        return null;
    }
    var user = await _1.db.collection('_swizzle_users').findOne({ _id: uidObject });
    user = addUserIdToUser(user);
    return user;
}
exports.getUser = getUser;
async function searchUsers(query) {
    var users = await _1.db.collection('_swizzle_users').find(query).toArray();
    users = users.map(addUserIdToUser);
    return users;
}
exports.searchUsers = searchUsers;
function signTokens(uid, hours = 24) {
    try {
        const secretKey = process.env.SWIZZLE_JWT_SECRET_KEY;
        const refreshSecretKey = process.env.SWIZZLE_REFRESH_JWT_SECRET_KEY;
        if (!secretKey || !refreshSecretKey) {
            return null;
        }
        const accessToken = jsonwebtoken_1.default.sign({ userId: uid }, secretKey, { expiresIn: `${hours}h` });
        const refreshToken = jsonwebtoken_1.default.sign({ userId: uid }, refreshSecretKey);
        return { accessToken, refreshToken };
    }
    catch (err) {
        console.log(err);
        return null;
    }
}
exports.signTokens = signTokens;
function refreshTokens(oldRefreshToken, hours = 24) {
    try {
        const refreshSecretKey = process.env.SWIZZLE_REFRESH_JWT_SECRET_KEY;
        if (!refreshSecretKey) {
            return null;
        }
        const decoded = jsonwebtoken_1.default.verify(oldRefreshToken, refreshSecretKey);
        if (typeof decoded !== 'object' || decoded === null) {
            throw new Error('Invalid token');
        }
        if (!('userId' in decoded)) {
            throw new Error('Token payload does not contain userId');
        }
        const userId = decoded.userId;
        const newTokens = signTokens(userId, hours);
        if (!newTokens) {
            return null;
        }
        return { accessToken: newTokens.accessToken, refreshToken: newTokens.refreshToken };
    }
    catch (err) {
        console.log(err);
        return null;
    }
}
exports.refreshTokens = refreshTokens;
async function editUser(uid, newUserProperties) {
    const uidObject = (0, swizzle_db_connection_1.UID)(uid);
    if (!uidObject) {
        return null;
    }
    var filteredProperties = newUserProperties;
    delete filteredProperties._id;
    delete filteredProperties.createdAt;
    filteredProperties.updatedAt = new Date();
    delete filteredProperties.lastLoginIp;
    var updatedUser = _1.db.collection('_swizzle_users').findOneAndUpdate({ _id: uidObject }, { $set: filteredProperties }, { upsert: true, returnDocument: 'after' });
    updatedUser = addUserIdToUser(updatedUser);
    return updatedUser;
}
exports.editUser = editUser;
async function createUser(properties, request) {
    var ip;
    if (request) {
        ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
    }
    var filteredProperties = { createdAt: new Date(), updatedAt: new Date() };
    if (properties) {
        filteredProperties = { ...filteredProperties, ...properties };
    }
    if (ip) {
        filteredProperties.lastLoginIp = ip;
    }
    filteredProperties.subscription = null;
    const users = _1.db.collection('_swizzle_users');
    const result = await users.insertOne(filteredProperties);
    if (result.acknowledged) {
        var newUser = await _1.db.collection('_swizzle_users').findOne({ _id: result.insertedId });
        newUser = addUserIdToUser(newUser);
        return newUser;
    }
    return null;
}
exports.createUser = createUser;
