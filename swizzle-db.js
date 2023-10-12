const {connectDB} = require('./swizzle-db-connection');

let _db;

const init = async () => {
  try {
    _db = await connectDB();
  } catch (err) {
    console.error('Failed to connect to DB:', err);
  }
};


Object.defineProperty(module.exports, 'db', {
  get: () => {
    if (!_db) {
      connectDB().then(connection => {
        _db = connection;
      }).catch(err => {
        console.error('Failed to connect to DB:', err);
      });
    }
    return _db;
  }
});

module.exports.init = init;