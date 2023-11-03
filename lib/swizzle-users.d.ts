import { Request } from 'express';
import { ObjectId } from 'mongodb';
export declare function addUserIdToUser(user: any): any;
export declare function getUser(uid: string | ObjectId): Promise<import("mongodb").WithId<import("bson").Document> | null>;
export declare function searchUsers(query: object): Promise<import("mongodb").WithId<import("bson").Document>[]>;
export declare function signTokens(uid: string, hours?: number): {
    accessToken: string;
    refreshToken: string;
} | null;
export declare function refreshTokens(oldRefreshToken: string, hours?: number): {
    accessToken: string;
    refreshToken: string;
} | null;
export declare function editUser(uid: string | ObjectId, newUserProperties: {
    [key: string]: any;
}): Promise<import("mongodb").WithId<import("bson").Document> | null>;
export declare function createUser(properties: {
    [key: string]: any;
}, request: Request): Promise<import("mongodb").WithId<import("bson").Document> | null>;
//# sourceMappingURL=swizzle-users.d.ts.map