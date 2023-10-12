const {connectDB} = require('./swizzle-db-connection');

let _db;

const init = async () => {
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

init().catch(err => console.error(err));  // Initialize at the time of require

module.exports = { db: _db, init };
