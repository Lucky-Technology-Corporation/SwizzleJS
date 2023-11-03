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
import {getSecret} from './swizzle-secrets';
import { analyticsMiddleware } from './swizzle-monitoring';

export {
  getSecret,
  analyticsMiddleware,
  
  setupPassport,
  connectDB,
  UID,
  optionalAuthentication,
  requiredAuthentication,
  AuthenticatedRequest, 
  
  init as initDb,
  dbProxy as db,

  saveFile,
  deleteFile,
  getFileUrl,
  addUserToFile,
  removeUserFromFile,
  storageHandler,
  
  getUser,
  editUser,
  createUser,
  searchUsers,
  signTokens,
  refreshTokens
};
