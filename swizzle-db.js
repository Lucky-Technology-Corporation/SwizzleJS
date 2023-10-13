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

(async () => {
  try {
    await init();
  } catch (err) {
    console.error(err);
  }
})();

const dbProxy = new Proxy({}, {
  get: function(target, name) {
    if (!_db) {
      throw new Error('DB not initialized');
    }
    return _db[name];
  }
});

module.exports = { db: dbProxy, init };
