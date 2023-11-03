"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requiredAuthentication = exports.optionalAuthentication = exports.setupPassport = void 0;
const passport_1 = __importDefault(require("passport"));
const passport_jwt_1 = require("passport-jwt");
const mongodb_1 = __importDefault(require("mongodb"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const opts = {};
opts.jwtFromRequest = function (req) {
    let token = null;
    if (req && req.headers.authorization) {
        token = passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    }
    if (!token && req && req.query && req.query.token) {
        token = req.query.token;
    }
    return token;
};
opts.secretOrKey = process.env.SWIZZLE_JWT_SECRET_KEY;
async function setupPassport(db) {
    passport_1.default.use(new passport_jwt_1.Strategy(opts, async (jwt_payload, done) => {
        if (!jwt_payload || !jwt_payload.userId) {
            return done(null, false);
        }
        try {
            const users = db.collection('_swizzle_users');
            var user = await users.findOne({ _id: new mongodb_1.default.ObjectId(jwt_payload.userId) });
            if (user) {
                user.userId = jwt_payload.userId;
                return done(null, user);
            }
            else {
                return done(null, false);
            }
        }
        catch (err) {
            return done(err, false);
        }
    }));
    passport_1.default.serializeUser(function (user, done) {
        done(null, user.id);
    });
    passport_1.default.deserializeUser(async function (id, done) {
        const users = db.collection('_swizzle_users');
        try {
            var user = await users.findOne({ _id: new mongodb_1.default.ObjectId(id) });
            if (!user) {
                done(null, false);
                return;
            }
            user.userId = id;
            done(null, user);
        }
        catch (err) {
            done(err, null);
        }
    });
}
exports.setupPassport = setupPassport;
const optionalAuthentication = (req, res, next) => {
    passport_1.default.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (user) {
            req.user = user;
        } // Attach the user to the request object if authenticated
        next(); // Always continue, even if not authenticated
    })(req, res, next);
};
exports.optionalAuthentication = optionalAuthentication;
const requiredAuthentication = (req, res, next) => {
    passport_1.default.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(401).send({ error: "Unauthorized" });
        }
        req.user = user; // Attach the user to the request object if authenticated
        next(); // Always continue, even if not authenticated
    })(req, res, next);
};
exports.requiredAuthentication = requiredAuthentication;
