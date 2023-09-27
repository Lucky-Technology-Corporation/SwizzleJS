const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();

let _db;

const connectDB = async () => {
  if (_db) {
    console.log("Reusing existing DB connection.");
    return _db;
  }

  try {
    const client = await MongoClient.connect(process.env.SWIZZLE_MONGODB_CONN_STRING, {
      useUnifiedTopology: true,
    });

    _db = client.db();

    console.log('MongoDB connected…');
    return _db;
  } catch (err) {
    console.error(err.message);
    // Exit process with failure
    process.exit(1);
  }
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
