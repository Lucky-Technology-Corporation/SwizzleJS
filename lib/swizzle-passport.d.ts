import { NextFunction, Request, RequestHandler, Response } from 'express';
import { Db } from "mongodb";
export interface AuthenticatedRequest extends Request {
    user?: any;
}
export declare function setupPassport(db: Db): Promise<void>;
export declare const optionalAuthentication: RequestHandler;
export declare const requiredAuthentication: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=swizzle-passport.d.ts.map