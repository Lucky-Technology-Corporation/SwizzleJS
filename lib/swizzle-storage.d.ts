import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { AuthenticatedRequest } from './swizzle-passport';
export declare const storageHandler: (request: AuthenticatedRequest, result: Response) => Promise<void | Response<any, Record<string, any>>>;
export declare function addUserToFile(unsignedFileUrl: string, userId: string | ObjectId): Promise<boolean>;
export declare function removeUserFromFile(unsignedFileUrl: string, userId: string | ObjectId): Promise<boolean>;
export declare function getFileUrl(unsignedFileUrl?: string, fileName?: string): Promise<string | import("@google-cloud/storage").GetSignedUrlResponse | null | undefined>;
export declare function saveFile(fileName: string, fileData: any, isPrivate?: boolean, allowedUsers?: [string?]): Promise<string | null>;
export declare function deleteFile(unsignedFileUrl?: string, fileName?: string): Promise<boolean>;
//# sourceMappingURL=swizzle-storage.d.ts.map