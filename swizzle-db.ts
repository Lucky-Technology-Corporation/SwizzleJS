import { Db } from "mongodb";

const {connectDB} = require('./swizzle-db-connection');

let _db: Db | null = null;

export const init = async () => {
  try {
    if(_db){
      return _db;
    }
    _db = await connectDB();
    return _db
  } catch (err) {
    console.error('Failed to connect to DB:', err);
  }
};

(async () => {
  try {
    await init();
  } catch (err) {
    console.error(err);
  }
})();

export const dbProxy: Db = new Proxy({} as Db, {
  get: function(target, name: string) {
    if (!_db) {
      throw new Error('DB not initialized');
    }
    return _db[name as keyof typeof _db];
  }
});