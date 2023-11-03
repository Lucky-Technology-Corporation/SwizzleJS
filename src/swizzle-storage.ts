import { Storage } from '@google-cloud/storage';
import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { AuthenticatedRequest } from './swizzle-passport';
import { db } from '.';
const storage = new Storage(); //Check on this - is this working in digital ocean?

//URL to access files
//If public, then it redirects to the google storage URL
//If private, it checks the user and then redirects to a weeklong signed URL
export const storageHandler = async (request: AuthenticatedRequest, result: Response) => {
  try {
    const fileName = request.params.key;
    const lastIndex = fileName.lastIndexOf('.');
    const nameWithoutExtension = lastIndex !== -1 ? fileName.substring(0, lastIndex) : fileName;

    const document = await db.collection('_swizzle_storage').findOne({ _id: new ObjectId(nameWithoutExtension) });
    
    if(!document){
      return result.status(404).json({ error: 'File not found' });
    }

    if (document.access === 'private') {
      if(!(document.allowedUsers || []).includes(request.user.userId)){ //if the user is not in the list of allowed users
        return result
          .status(401)
          .json({ error: 'You do not have access to this file' });
      }
    }

    const url = await getItem(document._id + "." + document.fileExtension, document.access)
    if(typeof url === "string"){
      return result.redirect(url)
    }

    return result.status(500).json({ error: 'Failed to sign file' })
  } catch (error) {
    console.error(error);
    return result.status(500).json({ error: error });
  }
};

const getItem = (filename: string, bucket: 'public' | 'private') => {
  const environment = process.env.SWIZZLE_ENV || 'test';
  const projectName = process.env.SWIZZLE_PROJECT_NAME || 'swizzle';

  try{
    if (bucket === 'public') {
      const fullBucketUrl = `${projectName}-${bucket}-data-${environment}`;
      return 'https://storage.googleapis.com/' + fullBucketUrl + '/' + filename;
    } else if (bucket === 'private') {
      const fullBucketUrl = `${projectName}-${bucket}-data-${environment}`;
      const bucketObject = storage.bucket(fullBucketUrl);
      const file = bucketObject.file(filename);
      const config: {
        action: "read" | "write" | "delete" | "resumable";
        expires: number;
      } = {
        action: 'read',
        expires: new Date().getTime() + 1000 * 60 * 60 * 24, // 24 hours
      };
      return file.getSignedUrl(config);
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

async function setItem(bucketType: 'public' | 'private', filename: string, fileData: any): Promise<void> {
  const projectName = process.env.SWIZZLE_PROJECT_NAME || 'swizzle';
  const environment = process.env.SWIZZLE_ENV || 'test';
  const fullBucketUrl = `${projectName}-${bucketType}-data-${environment}`;
  const bucket = storage.bucket(fullBucketUrl);
  const file = bucket.file(filename);

  const stream = file.createWriteStream({
    metadata: {
      contentType: 'auto', // automatically detect the file's MIME type
    },
  });

  return new Promise((resolve, reject) => {
    stream.on('error', (err) => {
      reject(err);
    });

    stream.on('finish', () => {
      resolve();
    });

    stream.end(fileData);
  });
}

async function deleteItem(bucketType: 'public' | 'private', filename: string) {
  const projectName = process.env.SWIZZLE_PROJECT_NAME || 'swizzle';
  const environment = process.env.SWIZZLE_ENV || 'test';
  const fullBucketUrl = `${projectName}-${bucketType}-data-${environment}`;
  const bucket = storage.bucket(fullBucketUrl);
  const file = bucket.file(filename);

  try {
    await file.delete();
    return true
  } catch (error) {
    console.error(`Failed to delete file ${filename} from bucket ${fullBucketUrl}.`, error);
    return false
  }
}
  
/*
usage:
const success = await addUserToFile(url, uid);

Returns a success boolean.
*/
export async function addUserToFile(unsignedFileUrl: string, userId: string | ObjectId){
  try{
    var stringUserId = userId
    if(userId instanceof ObjectId){
      stringUserId = (userId as ObjectId).toHexString()
    }
    const fileName = unsignedFileUrl.substring(unsignedFileUrl.lastIndexOf('/') + 1);
    var nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
    if(nameWithoutExtension == ""){ nameWithoutExtension = fileName }
    var document = await db.collection('_swizzle_storage').updateOne({ _id: new ObjectId(nameWithoutExtension) }, { $addToSet: { allowedUsers: stringUserId } });

    if (document.modifiedCount === 0) {
      return false;
    }  

    return true
  } catch (error) {
    console.error(error);
    return false;
  }
}

/*
usage:
const success = await removeUserFromFile(url, uid);

Returns a success boolean.
*/
export async function removeUserFromFile(unsignedFileUrl: string, userId: string | ObjectId){
  try{
    var stringUserId = userId
    if(userId instanceof ObjectId){
      stringUserId = (userId as ObjectId).toHexString()
    }
    const fileName = unsignedFileUrl.substring(unsignedFileUrl.lastIndexOf('/') + 1);
    var nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
    if(nameWithoutExtension == ""){ nameWithoutExtension = fileName }
    var document = await db.collection('_swizzle_storage').updateOne({ _id: new ObjectId(nameWithoutExtension) }, { $pull: { allowedUsers: userId } });

    if (document.modifiedCount === 0) {
      return false;
    }  

    return true
  } catch (error) {
    console.error(error);
    return false;
  }
}

/*
usage:
const file = await getFile('/swizzle/storage/507f1f77bcf86cd799439011.txt')

Returns the signed file URL if found overriding the access level.
*/
export async function getFileUrl(unsignedFileUrl?: string, fileName?: string){
  var document = null;

  if (unsignedFileUrl) {
    const fileName = unsignedFileUrl.substring(unsignedFileUrl.lastIndexOf('/') + 1);
    var nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
    if(nameWithoutExtension == ""){ nameWithoutExtension = fileName }
    document = await db.collection('_swizzle_storage').findOne({ _id: new ObjectId(nameWithoutExtension) });
  } else if(fileName) {
    var nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
    const isMongoObjectId = ObjectId.isValid(nameWithoutExtension);

    if(isMongoObjectId){
      document = await db.collection('_swizzle_storage').findOne({ _id: new ObjectId(nameWithoutExtension) });
    }

    if(!document){
      document = await db.collection('_swizzle_storage').findOne({ fileName: fileName });
    }
  }

  if (!document) {
    return null;
  }

  return getItem(document._id + "." + document.fileExtension, document.access)
}
  

/* 
usage: 
await saveFile('destination/path/in/bucket.txt', data);
await saveFile('destination/path/in/bucket.txt', data, true); //private, must be signed with getFile to access
*/
export async function saveFile(fileName: string, fileData: any, isPrivate: boolean = false, allowedUsers: [string?] = []) {
  try {
    var bucket: 'public' | 'private' = isPrivate ? 'private' : 'public';

    const fileExtension = fileName.substring(fileName.lastIndexOf('.') + 1);  

    const document = {
      fileName: fileName,
      fileExtension: fileExtension,
      createdAt: new Date(),
      updatedAt: new Date(),
      access: isPrivate ? "private" : 'public',
      allowedUsers: allowedUsers,
    };

    const result = await db.collection('_swizzle_storage').insertOne(document);

    await setItem(bucket, result.insertedId + "." + fileExtension, fileData);
    
    const environment = process.env.SWIZZLE_ENV || 'test';
    const projectName = process.env.SWIZZLE_PROJECT_NAME || 'swizzle';

    const domain = environment == "test" ? "swizzle-test.com" : "swizzle-app.com"
    const fullDomain = "https://api." + projectName + "." + domain

    const relativePath = "/swizzle/storage/" + result.insertedId + "." + fileExtension;

    return fullDomain + relativePath

  } catch (error) {
    console.error(error);
    return null;
  }
}
  
/*
usage:
const file = await deleteFile('/swizzle/storage/507f1f77bcf86cd799439011.txt')

Returns true if the file was deleted.
*/
export async function deleteFile(unsignedFileUrl?: string, fileName?: string) {
  try {        
    var document = null;

    if (unsignedFileUrl) {
      const fileName = unsignedFileUrl.substring(unsignedFileUrl.lastIndexOf('/') + 1);
      var nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
      if(nameWithoutExtension == ""){ nameWithoutExtension = fileName }
      document = await db.collection('_swizzle_storage').findOne({ _id: new ObjectId(nameWithoutExtension) });
    } else if(fileName) {
      var nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
      const isMongoObjectId = ObjectId.isValid(nameWithoutExtension);
  
      if(isMongoObjectId){
        document = await db.collection('_swizzle_storage').findOne({ _id: new ObjectId(nameWithoutExtension) });
      }
  
      if(!document){
        document = await db.collection('_swizzle_storage').findOne({ fileName: fileName });
      }
    }
  
    if (!document) {
      console.error("File not found");
      return false;
    }

    await db.collection("_swizzle_storage").deleteOne({_id: document._id})
    const result = await deleteItem(document.access, document._id + "." + document.fileExtension)
    return result
  } catch (error) {
    console.error(error);
    return false
  }
}
