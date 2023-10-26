const { Storage } = require('@google-cloud/storage');
const storage = new Storage(); //Check on this - is this working in digital ocean?
const { db } = require('./swizzle-db');
const { optionalAuthentication } = require('./swizzle-passport');
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

//URL to access files
//If public, then it redirects to the google storage URL
//If private, it checks the user and then redirects to a weeklong signed URL
router.get('/:key', optionalAuthentication, async (request, result) => {
    try {
      const fileName = request.params.key;
      const lastIndex = fileName.lastIndexOf('.');
      const nameWithoutExtension = lastIndex !== -1 ? fileName.substring(0, lastIndex) : fileName;

      const document = await db.collection('_swizzle_storage').findOne({ _id: new ObjectId(nameWithoutExtension) });
      
      if(!document){
        return result.status(404).json({ error: 'File not found' });
      }

      if (
        document.access === 'private' &&
        document.userId &&
        document.userId !== request.user.id
      ) {
        return result
          .status(401)
          .json({ error: 'You do not have access to this file' });
      }

      const url = await getItem(document._id + "." + document.fileExtension, document.access)
      return result.redirect(url)
  
    } catch (error) {
      console.error(error);
      return result.status(500).json({ error: error });
    }
  });
  
  const getItem = (filename, bucket) => {
    const environment = process.env.SWIZZLE_ENV || 'test';
    const projectName = process.env.SWIZZLE_PROJECT_NAME || 'swizzle';
  
    try{
      if (bucket === 'public') {
        const fullBucketUrl = `${projectName}-${bucket}-data-${environment}`;
        return 'https://storage.googleapis.com/' + fullBucketUrl + '/' + filename;
      } else if (bucket === 'private') {
        const fullBucketUrl = `${projectName}-${bucket}-data-${environment}`;
        const bucket = storage.bucket(fullBucketUrl);
        const file = bucket.file(filename);
        const config = {
          action: 'read',
          expires: new Date().getTime() + 1000 * 60 * 60 * 24 * 7, // 1 week
        };
        return file.getSignedUrl(config);
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  async function setItem(bucketType, filename, fileData) {
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
  
  async function deleteItem(bucketType, filename) {
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
  const file = await getFile('filename.txt');
  const file = await getFile('https://your-domain.com/swizzle/storage/507f1f77bcf86cd799439011.txt')
  const file = await getFile('/swizzle/storage/507f1f77bcf86cd799439011.txt')

  Returns the signed file URL if found overriding the access level.
  */
  async function getFile(filename){
    
    const isUrl = filename.startsWith('http') || filename.startsWith('/swizzle/storage');
    const isMongoObjectId = ObjectId.isValid(filename.split(".")[0]);
    var document = null;

    if (isUrl || isMongoObjectId) {
      const fileName = filename.substring(filename.lastIndexOf('/') + 1);
      var nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
      if(nameWithoutExtension == ""){ nameWithoutExtension = fileName }
      document = await db.collection('_swizzle_storage').findOne({ _id: new ObjectId(nameWithoutExtension) });
    } else {
      document = await db.collection('_swizzle_storage').findOne({ fileName: filename });
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
  async function saveFile(fileName, fileData, isPrivate = false) {
    try {
      var bucket = isPrivate ? 'private' : 'public';

      const fileExtension = fileName.substring(filename.lastIndexOf('.') + 1);  

      const document = {
        fileName: fileName,
        fileExtension: fileExtension,
        createdAt: new Date(),
        updatedAt: new Date(),
        access: isPrivate ? "private" : 'public',
      };
  
      const result = await db.collection('_swizzle_storage').insertOne(document);

      await setItem(bucket, result.insertedId + "." + fileExtension, fileData);
      
      return "/swizzle/storage/" + result.insertedId + "." + fileExtension;

    } catch (error) {
      console.error(error);
      return null;
    }
  }
  

  async function deleteFile(filename) {
    try {        
      const isUrl = filename.startsWith('http') || filename.startsWith('/swizzle/storage');
      const isMongoObjectId = ObjectId.isValid(filename.split(".")[0]);
      var document = null;

      if (isUrl || isMongoObjectId) {
        const fileName = filename.substring(filename.lastIndexOf('/') + 1);
        var nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
        if(nameWithoutExtension == ""){ nameWithoutExtension = fileName }
        document = await db.collection('_swizzle_storage').findOne({ _id: new ObjectId(nameWithoutExtension) });
      } else {
        document = await db.collection('_swizzle_storage').findOne({ fileName: filename });
      }
    
      if(!document){
        return false
      }

      await db.collection("_swizzle_storage").deleteOne({_id: document._id})
      const result = await deleteItem(document.access, document._id + "." + document.fileExtension)
      return result
    } catch (error) {
        console.error(error);
        return false
    }
  }
  
  module.exports = {
    storageRoutes: router,
    saveFile: saveFile,
    deleteFile: deleteFile,
    getFile: getFile,
  };
  