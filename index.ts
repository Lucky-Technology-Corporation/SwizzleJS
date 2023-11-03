import { dbProxy, init } from './swizzle-db';
import { connectDB, UID} from './swizzle-db-connection';
import { 
  optionalAuthentication, 
  requiredAuthentication, 
  setupPassport, 
  AuthenticatedRequest 
} from './swizzle-passport';
import { storageHandler, addUserToFile, removeUserFromFile, getFileUrl, saveFile, deleteFile } from './swizzle-storage';
import { getUser, editUser, createUser, searchUsers, signTokens, refreshTokens } from './swizzle-users';
import * as secrets from './swizzle-secrets';
import * as internalRoutes from './swizzle-internal';
import * as analyticsMiddleware from './swizzle-monitoring';

export {
  secrets,
  internalRoutes,
  analyticsMiddleware,
  
  setupPassport,
  connectDB,
  UID,
  optionalAuthentication,
  requiredAuthentication,
  AuthenticatedRequest, //TODO: Add to server.js and codegen
  
  init as initDb,
  dbProxy as db,

  saveFile,
  deleteFile,
  getFileUrl,
  addUserToFile,
  removeUserFromFile,
  storageHandler, //TODO: Add to server.js - router.get('/:key', optionalAuthentication, getKeyHandler);
  
  getUser,
  editUser,
  createUser,
  searchUsers,
  signTokens,
  refreshTokens
};
