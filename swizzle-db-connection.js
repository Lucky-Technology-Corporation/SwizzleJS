const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();

let _db;

const connectDB = async () => {
  try {
    const client = await MongoClient.connect(process.env.SWIZZLE_MONGODB_CONN_STRING, {
      useUnifiedTopology: true,
    });

    _db = client.db();

    console.log('MongoDB connected…');
  } catch (err) {
    console.error(err.message);
    // Exit process with failure
    process.exit(1);
  }
};

const getDb = () => {
  if (!_db) {
    throw Error('Database not initialized. Did you forget to call connectDB?');
  }
  return _db;
};

const UID = (user) => {
  if(!user || !user.userId){
    return null;
  }
  return new ObjectId(user.userId);
};

module.exports = {
  connectDB,
  getDb,
  UID
};
