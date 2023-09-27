const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const passport = require('passport');
const mongodb = require('mongodb');
const { getDb } = require('./swizzle-db-connection');

router.get('/:key', passport.authenticate('jwt', { session: false }), async (request, result) => {
    try{
        const key = request.params.key;
        const userId = request.user.userId;
        const db = getDb();
        
        var doc = await db.collection(key).findOne({ _swizzle_uid: new mongodb.ObjectId(userId) })
        if (!doc) {
            return result.status(200).json({});
        }
        
        delete doc['_swizzle_uid'];
        delete doc['_id'];
        delete doc['updatedAt']
        delete doc['createdAt']
        
        return result.json(doc);
    } catch(error){
        console.log(error);
        return result.status(500).json({error: error});
    }
});


router.post('/:key', passport.authenticate('jwt', { session: false }), async (request, result) => {
    try{
        const key = request.params.key;
        const userId = request.user.userId;
        const db = getDb();
        
        const userObjectId = new mongodb.ObjectId(userId)
        
        var documentUpdate = request.body;
        documentUpdate._swizzle_uid = userObjectId;
        documentUpdate.updatedAt = new Date();
        
        const doc = await db.collection(key).updateOne(
            { _swizzle_uid: userObjectId },
            {
                $set: documentUpdate,
                $setOnInsert: { createdAt: new Date() }
            },
            { upsert: true }
        );
            
        return result.json(doc);
    } catch(error){
        console.log(error);
        return result.status(500).json({error: error});
    }
});



module.exports = router;
