const connectDB = require('./swizzle-db-connection');

let _db;

Object.defineProperty(module.exports, 'db', {
  get: () => {
    if (!_db) {
      console.log('Database not initialized. Automatically calling connectDB.');
      connectDB().then(connection => {
        _db = connection;
      }).catch(err => {
        console.error('Failed to connect to DB:', err);
      });
    }
    return _db;
  }
});