const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();

let _db = null;
let connectionPromise = null;

const connectDB = async () => {
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
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  })();

  return connectionPromise;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const UID = (user) => {
  if(!user || !user.userId || !user._id){
    return null;
  }
  if(typeof user === 'string'){
    return new ObjectId(user);
  }
  if(user._id){
    return user._id;
  }
  return new ObjectId(user.userId);
};

module.exports = {
  connectDB,
  UID
};
