import { Db, ObjectId } from 'mongodb';
export declare const connectDB: () => Promise<Db | null>;
export declare const UID: (user: ObjectId | string | any) => ObjectId | null;
//# sourceMappingURL=swizzle-db-connection.d.ts.map