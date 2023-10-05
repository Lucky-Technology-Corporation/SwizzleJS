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
      const client = await MongoClient.connect(process.env.SWIZZLE_MONGODB_CONN_STRING, {
        useUnifiedTopology: true,
      });
      _db = client.db("main");
      console.log('MongoDB connected…');
      return _db;
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  })();

  return connectionPromise;
};


const UID = (user) => {
  if(!user || !user.userId){
    return null;
  }
  return new ObjectId(user.userId);
};

module.exports = {
  connectDB,
  UID
};
