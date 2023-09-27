const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const { db } = require('./swizzle-db');
const mongodb = require('mongodb');
require('dotenv').config();

const opts = {}
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = process.env.SWIZZLE_JWT_SECRET_KEY;

function setupPassport() {
    passport.use(new JwtStrategy(opts, async (jwt_payload, done) => {
        try {
            const users = db.collection('_swizzle_users'); 
            var user = await users.findOne({ _id: new mongodb.ObjectId(jwt_payload.userId) });   

            if (user) {
                user.userId = jwt_payload.userId;
                return done(null, user);
            } else {
                return done(null, false);
            }
        } catch (err) {
            return done(err, false);
        }
    }));
    

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(async function(id, done) {
        const users = db.collection('_swizzle_users');
        try {
            var user = await users.findOne({ _id: new mongodb.ObjectId(id) });
            user.userId = id;
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });
}

const optionalAuthentication = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
      if (err) { return next(err); }
      if (user) { req.user = user; } // Attach the user to the request object if authenticated
      next(); // Always continue, even if not authenticated
    })(req, res, next);
};  

const requiredAuthentication = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err) { return next(err); }
        if (!user) { return res.status(401).send({error: "Unauthorized"}); }
        req.user = user; // Attach the user to the request object if authenticated
        next(); // Always continue, even if not authenticated
    })(req, res, next);
};

module.exports = {setupPassport, optionalAuthentication, requiredAuthentication};


