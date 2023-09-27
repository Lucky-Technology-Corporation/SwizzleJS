const notifications = require('./swizzle-notifications');
const storage = require('./swizzle-storage');
const dbUtilities = require('./swizzle-db-connection');
const authMiddleware = require('./swizzle-passport');

module.exports = {
    authRoutes: require('./swizzle-auth'),
    dbRoutes: require('./swizzle-db-driver'),
    internalRoutes: require('./swizzle-internal'),
    analyticsMiddleware: require('./swizzle-monitoring'),  
    
    setupPassport: authMiddleware.setupPassport,
    connectDB: dbUtilities.connectDB,
    setupNotifications: notifications.setupNotifications,
    storageRoutes: storage.storageRoutes,

    optionalAuthenticate: authMiddleware.optionalAuthenticate,
    requiredAuthenticate: authMiddleware.requiredAuthenticate,

    db: require('./swizzle-db'),
    secrets: require('./swizzle-secrets'),
    UID: dbUtilities.UID,
    sendNotification: notifications.sendNotification,
    saveFile: storage.saveFile,
    deleteFile: storage.deleteFile,
};
  