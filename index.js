module.exports = {
    authRoutes: require('./swizzle-auth'),
    dbRoutes: require('./swizzle-db-driver'),
    internalRoutes: require('./swizzle-internal'),
    analyticsMiddleware: require('./swizzle-monitoring'),
    authMiddleware: require('./swizzle-passport'),    

    db: require('./swizzle-db-connection'),
    notifications: require('./swizzle-notifications'),
    secrets: require('./swizzle-secrets'),
    storage: require('./swizzle-storage'),
};
  