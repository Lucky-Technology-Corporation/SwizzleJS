import { Db, MongoClient, ObjectId } from 'mongodb';
require('dotenv').config();

let _db: Db | null = null;
let connectionPromise: Promise<Db | null> | null = null;

export const connectDB = async () => {
  if (_db) {
    return _db;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      while (typeof process.env.SWIZZLE_MONGODB_CONN_STRING === 'undefined') {
        console.log('Waiting for server to initialize...');
        await sleep(500);
      }
      const client = await MongoClient.connect(process.env.SWIZZLE_MONGODB_CONN_STRING, {
        tls: true,
        tlsInsecure: true,
      });
      _db = client.db("main");
      console.log('Database connected');
      return _db;
    } catch (err: any) {
      console.error(err.message);
      process.exit(1);
    }
  })();

  return connectionPromise;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const UID = (user: ObjectId | string | any): ObjectId | null => {
  if(!user || !user.userId || !user._id){
    return null;
  }
  if(typeof user === 'string'){
    return new ObjectId(user);
  }
  if(user._id instanceof ObjectId){
    return user._id;
  }
  return new ObjectId(user.userId);
};