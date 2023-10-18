const notifications = require('./swizzle-notifications');
const storage = require('./swizzle-storage');
const dbUtilities = require('./swizzle-db-connection');
const authMiddleware = require('./swizzle-passport');
const authUtils = require('./swizzle-users');
const {db, init} = require('./swizzle-db');

module.exports = {
    secrets: require('./swizzle-secrets'),

    dbRoutes: require('./swizzle-db-driver'),
    internalRoutes: require('./swizzle-internal'),
    analyticsMiddleware: require('./swizzle-monitoring'),  
    authUtils: require('./swizzle-users'),

    setupPassport: authMiddleware.setupPassport,
    connectDB: dbUtilities.connectDB,
    setupNotifications: notifications.setupNotifications,

    optionalAuthentication: authMiddleware.optionalAuthentication,
    requiredAuthentication: authMiddleware.requiredAuthentication,

    initDb: init,
    db: db,
    UID: dbUtilities.UID,
    sendNotification: notifications.sendNotification,
    saveFile: storage.saveFile,
    deleteFile: storage.deleteFile,
    getFile: storage.getFile,

    storageRoutes: storage.storageRoutes,

    getUser: authUtils.getUser,
    getUserSubscription: authUtils.getUserSubscription,
    editUser: authUtils.editUser,
    setUserSubscription: authUtils.setUserSubscription,
    createUser: authUtils.createUser,
    searchUsers: authUtils.searchUsers,
};
  