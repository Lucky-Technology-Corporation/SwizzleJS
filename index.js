const notifications = require('./swizzle-notifications');
const storage = require('./swizzle-storage');
const dbUtilities = require('./swizzle-db-connection');
const authMiddleware = require('./swizzle-passport');

module.exports = {
    secrets: require('./swizzle-secrets'),

    authRoutes: require('./swizzle-auth'),
    dbRoutes: require('./swizzle-db-driver'),
    internalRoutes: require('./swizzle-internal'),
    analyticsMiddleware: require('./swizzle-monitoring'),  
    appleRoutes: require('./swizzle-apple'),

    setupPassport: authMiddleware.setupPassport,
    connectDB: dbUtilities.connectDB,
    setupNotifications: notifications.setupNotifications,
    storageRoutes: storage.storageRoutes,

    optionalAuthentication: authMiddleware.optionalAuthentication,
    requiredAuthentication: authMiddleware.requiredAuthentication,

    db: require('./swizzle-db'),
    UID: dbUtilities.UID,
    sendNotification: notifications.sendNotification,
    saveFile: storage.saveFile,
    deleteFile: storage.deleteFile,
    getFile: storage.getFile,
};
  