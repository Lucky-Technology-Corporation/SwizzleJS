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
router.get('/*key', optionalAuthentication, async (request, result) => {
    try {
      const fileName = request.params.key;
      const lastIndex = fileName.lastIndexOf('.');
      const nameWithoutExtension = lastIndex !== -1 ? fileName.substring(0, lastIndex) : fileName;

      //Get document
      
      const document = await db
        .collection('_swizzle_storage')
        .findOne({ _id: ObjectId(nameWithoutExtension) });

      if (!document) {
        return result.status(404).json({ error: 'No document found' });
      }

      //Check access
      if (
        document.access === 'private' &&
        document.userId &&
        document.userId !== request.user.id
      ) {
        return result
          .status(401)
          .json({ error: 'You do not have access to this file' });
      }
  
      //Return redirect to file URL
      const bucket = document.access;
      return result.redirect(getItem(fileName, bucket));
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


  /*
  usage:
  const file = await getFile('filename.txt');
  const file = await getFile('https://your-domain.com/swizzle/storage/507f1f77bcf86cd799439011.txt')

  Returns the signed file URL if found overriding the access level.
  */
  async function getFile(filename){
    const isUrl = filename.startsWith('http') || filename.startsWith('/swizzle/storage');
    if(isUrl){
      const fileName = filename.substring(filename.lastIndexOf('/') + 1);
      const nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.'));
      const document = await db.collection('_swizzle_storage').findOne({ _id: ObjectId(nameWithoutExtension) });
      return getItem(document._id + "." + document.fileExtension, document.access)
    } else{
      const document = await db
          .collection('_swizzle_storage')
          .findOne({ fileName: filename });
      return getItem(document._id + "." + document.fileExtension, document.access)
    }
  }
  

  /* 
  usage: 
  await saveFile('destination/path/in/bucket.txt', data);
  await saveFile('destination/path/in/bucket.txt', data, userId);
  
  When a userId is provided, the file is added to the private bucket.
  */
  async function saveFile(fileName, fileData, ownerUserId) {
    try {
      var bucket = 'public';
      var userObjectId = null;
      if (ownerUserId) {
        bucket = 'private';
        userObjectId = new mongodb.ObjectId(ownerUserId);
      }
  
      
      const fileExtension = fileName.substring(filename.lastIndexOf('.') + 1);  
      const document = {
        userId: userObjectId,
        fileName: fileName,
        fileExtension: fileExtension,
        createdAt: new Date(),
        updatedAt: new Date(),
        access: request.body.access || 'public',
      };
  
      const result = await db.collection('_swizzle_storage').insertOne(document);

      await setItem(bucket, result.insertedId + "." + fileExtension, fileData);
      
      return "/swizzle/storage/" + result.insertedId + "." + fileExtension;

    } catch (error) {
      console.error(error);
      return null;
    }
  }
  
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
  
  async function deleteFile(fileName) {
    try {        
        const nameWithoutExtension = lastIndex !== -1 ? fileName.substring(0, lastIndex) : fileName;
        const dbDocument = await db.collection("_swizzle_storage").findOne({_id: ObjectId(nameWithoutExtension)});
        

        return true
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
  