const { Storage } = require('@google-cloud/storage');
const storage = new Storage(); //Check on this - is this working in digital ocean?
const { db } = require('./swizzle-db');
const { optionalAuthenticate } = require('./swizzle-passport');
const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

//URL to access files
//If public, then it redirects to the google storage URL
//If private, it checks the user and then redirects to a weeklong signed URL
router.get('/*key', optionalAuthenticate, async (request, result) => {
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
  };
  
  //URL to upload files
  //If authenticated, then it uploads to the private folder
  //If not it uploads to the public folder
  // router.post('/*key', optionalAuthenticate, async (request, result) => {
  //   try {
  //     const fileName = request.params.key;
  //     
  //     const document = await db
  //       .collection('_swizzle_storage')
  //       .findOne({ fileName: fileName });
  //     if (document) {
  //       console.error(
  //         '[SwizzleStorage] ' + fileName + ' ( ' + bucket + ' ) already exists'
  //       );
  //       return result.status(404).json({ error: 'No document found' });
  //     }
  
  //     const bucket = request.user ? 'private' : 'public';
  //     const file = request.body.file;
  
  //     await setItem(bucket, fileName, file);
  
  //     const userObjectId = request.user
  //       ? new mongodb.ObjectId(request.user.id)
  //       : null;
  //     const fileDocument = {
  //       userId: userObjectId,
  //       fileName: fileName,
  //       createdAt: new Date(),
  //       updatedAt: new Date(),
  //       access: bucket,
  //     };
  
  //     await db.collection('_swizzle_storage').insertOne(fileDocument);
  
  //     return result.status(200).json({ success: true });
  //   } catch (error) {
  //     console.error(error);
  //     return result.status(500).json({ error: error });
  //   }
  // });
  
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
      
      return result.insertedId + "." + fileExtension;

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
  
  async function deleteFile(fileName, ownerUserId) {
    // try {
    //     var bucket = "public";
    //     var userObjectId = null
    //     if(ownerUserId){
    //         bucket = "private";
    //         userObjectId = new mongodb.ObjectId(ownerUserId)
    //     }
    //     
    //     const dbDocument = await db.collection("_swizzle_storage").findOne({fileName: fileName});
    //     if(dbDocument){
    //         console.error("[SwizzleStorage] " + fileName + " already exists.")
    //         return false
    //     }
    //     await setItem(bucket, filename, fileData);
    //     const document = {
    //         userId: userObjectId,
    //         fileName: fileName,
    //         createdAt: new Date(),
    //         updatedAt: new Date(),
    //         access: request.body.access || "public",
    //     }
    //     await db.collection("_swizzle_storage").insertOne(document);
    //     return true
    // } catch (error) {
    //     console.error(error);
    //     return false
    // }
  }
  
  module.exports = {
    storageRoutes: router,
    saveFile: saveFile,
    deleteFile: deleteFile,
  };
  