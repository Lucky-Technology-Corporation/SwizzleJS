import dotenv from 'dotenv';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { Db, ObjectId } from 'mongodb';
import passport from 'passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
dotenv.config()

export interface AuthenticatedRequest extends Request {
    user?: any;
}  

const opts: any = {}
opts.jwtFromRequest = function (req: any) {
    let token = null;
    if (req && req.headers.authorization) {
      token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    }
    if (!token && req && req.query && req.query.token) {
      token = req.query.token;
    }
    return token;
};
opts.secretOrKey = process.env.SWIZZLE_JWT_SECRET_KEY;

export async function setupPassport(db: Db) {

    passport.use(new Strategy(opts, async (jwt_payload: any, done: any) => {   
        console.log("jwt_payload", jwt_payload)
        if (!jwt_payload || !jwt_payload.userId) {
            return done(null, false);
        }

        try {
            const users = db.collection('_swizzle_users'); 
            var user = await users.findOne({ _id: new ObjectId(jwt_payload.userId) });   
            console.log("user", JSON.stringify(user))
            console.log("jwt_payload", jwt_payload)
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
    

    passport.serializeUser(function(user: any, done: any) {
        done(null, user._id.toString());
    });

    passport.deserializeUser(async function(id: any, done: any) {
        const users = db.collection('_swizzle_users');
        try {
            var user = await users.findOne({ _id: new ObjectId(id) });
            if(!user){
                done(null, false);
                return
            }
            user.userId = id.toString();
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });
}

export const optionalAuthentication: RequestHandler = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    passport.authenticate('jwt', { session: false }, (err: any, user: any, info: any) => {
      if (err) { return next(err); }
      if (user && !user._deactivated) { req.user = user; } // Attach the user to the request object if authenticated
      next(); // Always continue, even if not authenticated
    })(req, res, next);
};  

export const requiredAuthentication = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    passport.authenticate('jwt', { session: false }, (err: any, user: any, info: any) => {
        if (err) { return next(err); }
        if (!user || user._deactivated) { return res.status(401).send({error: "Unauthorized"}); }
        req.user = user; // Attach the user to the request object if authenticated
        next(); // Always continue, even if not authenticated
    })(req, res, next);
};



