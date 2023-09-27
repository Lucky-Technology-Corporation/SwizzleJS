const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const ObjectId = require('mongodb').ObjectId;
const { UID } = require('./swizzle-db-connection');
const { db } = require('./swizzle-db');
const passport = require('passport');
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

var twilioClient = null;
if(accountSid && authToken){
    twilioClient = require('twilio')(accountSid, authToken);
}

//Anonymous login
router.post('/anonymous', async (request, result) => {
      
    const users = db.collection('_swizzle_users');  

    const deviceId = request.body.deviceId;
    let ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
    
    let user = await users.findOne({ deviceId: deviceId });
    
    // If a user does not exist, create a new one
    if (!user) {
        user = { deviceId: deviceId, createdAt: new Date(), updatedAt: new Date(), isAnonymous: true, lastLoginIp: ip};
        await users.insertOne(user);
    }

    if(user._deactivated){
        return result.status(400).json({ error: 'User deactivated.' });
    }

    if(!user.isAnonymous){
        return result.status(400).json({ error: 'User is not anonymous.' });
    }
    
    const userId = user._id;

    // Create a JWT token
    const accessToken = jwt.sign({ userId: userId }, process.env.SWIZZLE_JWT_SECRET_KEY, { expiresIn: '24h' });
    const refreshToken = jwt.sign({ userId: userId }, process.env.SWIZZLE_REFRESH_JWT_SECRET_KEY);

    return result.json({ userId: user._id, accessToken: accessToken, refreshToken: refreshToken });
});

//SMS login

async function sendSMS(phoneNumber, message) {    
    if(!twilioClient){
        return;
    }
    
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    
    return twilioClient.messages
        .create({
            body: message,
            from: twilioPhoneNumber,
            to: phoneNumber
        });
}

router.post('/sms/request-code', async (request, result) => {
    
    const users = db.collection('_swizzle_users');

    const phoneNumber = request.body.phoneNumber;
    
    // Get the userId from the JWT token in the Authorization header
    const token = request.headers['Authorization'];
    const decoded = jwt.verify(token, process.env.SWIZZLE_JWT_SECRET_KEY);
    const userId = new ObjectId(decoded.userId);;
    
    //Find the user
    let user = await users.findOne({ _id: userId }) || {};
    
    // Generate a random verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    
    // Save the verification code and phone number in the user record
    user.isAnonymous = false;
    user.phoneNumber = phoneNumber;
    user.verificationCode = verificationCode;
    await users.updateOne({ _id: userId }, { $set: user });
    
    await sendSMS(phoneNumber, `Your verification code is: ${verificationCode}`);
    
    result.status(200).json({ message: 'Verification code sent.' });
});

router.post('/sms/verify-code', async (request, result) => {
    
    const users = db.collection('_swizzle_users');

    // Get the userId from the JWT token in the Authorization header
    const token = request.headers['Authorization'];
    const decoded = jwt.verify(token, process.env.SWIZZLE_JWT_SECRET_KEY);
    const userId = new ObjectId(decoded.userId);;

    const { code } = request.body;
    
    let user = await users.findOneAndUpdate({ _id: userId }, {verificationCode: null, updatedAt: new Date()}, { returnOriginal: true });
    
    // If the user does not exist or the verification code does not match, return an error
    if (!user || user.verificationCode !== code) {
        return result.status(400).json({ error: 'Invalid code.' });
    }

    if(user._deactivated) {
        return result.status(400).json({ error: 'User deactivated.' });
    }
    
    // Generate JWT tokens
    const accessToken = jwt.sign({ userId: userId }, process.env.SWIZZLE_JWT_SECRET_KEY, { expiresIn: '24h' });
    const refreshToken = jwt.sign({ userId: userId }, process.env.SWIZZLE_REFRESH_JWT_SECRET_KEY);
    result.json({ userId: user._id, accessToken, refreshToken });
});


router.post('/refresh', async (request, result) => {
    try{
        const { refreshToken, deviceId } = request.body;
        let ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;

        if (!refreshToken) {
            return result.status(400).send({ error: 'Refresh token is required' });
        }

        
        const users = db.collection('_swizzle_users');

        //find the user and update if we do
        let userOp = await users.findOneAndUpdate({ deviceId: deviceId }, { $set: { lastLoginIp: ip } }, { new: true });
        let user = userOp.value

        if(!user || user._deactivated) {
            return result.status(400).send({ error: 'User not found' });
        }

        jwt.verify(refreshToken, process.env.SWIZZLE_REFRESH_JWT_SECRET_KEY, (err, payload) => {
            if (err) {
                console.log(err);
                return result.status(401).send({ error: 'Refresh token is invalid' });
            }

            const accessToken = jwt.sign({ userId: user._id }, process.env.SWIZZLE_JWT_SECRET_KEY, { expiresIn: '24h' });
            const newRefreshToken = jwt.sign({ userId: user._id }, process.env.SWIZZLE_REFRESH_JWT_SECRET_KEY);

            return result.json({ userId: user._id, accessToken: accessToken, refreshToken: newRefreshToken });
        });
    } catch (err) {
        console.error(err.message);
        result.status(500).send({error: "Couldn't refresh your token"});
    }
});

router.post('/push-token', passport.authenticate('jwt', { session: false }), async (request, result) => {
    try{
        
        const users = db.collection('_swizzle_users');
        await users.findOneAndUpdate({ _id: UID(request.user) }, { $set: { pushToken: request.body.pushToken } });
        result.status(200).send({message: "Push token updated"});
    } catch (err) {
        console.error(err.message);
        result.status(500).send({error: "Couldn't update your push token"});
    }
});

router.post('/metadata', passport.authenticate('jwt', { session: false }), async (request, result) => {
    try{
        
        const users = db.collection('_swizzle_users');
        
        const updateObject = {};
        for (const [key, value] of Object.entries(request.body)) {
            updateObject[`metadata.${key}`] = value;
        }
        await users.findOneAndUpdate({ _id: UID(request.user) }, { $set: updateObject });

        result.status(200).send({message: "Push token updated"});
    } catch (err) {
        console.error(err.message);
        result.status(500).send({error: "Couldn't update your push token"});
    }
});



router.post('/delete-account', passport.authenticate('jwt', { session: false }), async (request, result) => {
    try{
        
        const users = db.collection('_swizzle_users');
        await users.deleteOne({ _id: UID(request.user) });   
        result.status(200).send({message: "Account deleted"});
    } catch (err) {
        console.error(err.message);
        result.status(500).send({error: "Couldn't delete your account"});
    }
});

//This sets arbitrary user data
router.post('/update-info', passport.authenticate('jwt', { session: false }), async (request, result) => {
    try{
        
        const users = db.collection('_swizzle_users');
        let ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;

        var updateObject = request.body
        updateObject.updatedAt = new Date();
        updateObject.lastLoginIp = ip;

        delete updateObject._id;
        delete updateObject.deviceId;
        delete updateObject.createdAt;

        let user = await users.findOneAndUpdate({ _id: UID(request.user) }, { $set: updateObject }, { returnOriginal: false });
        result.status(200).send(user.value);
    }
    catch (err) {
        console.error(err.message);
        result.status(500).send({error: "Couldn't update your info"});
    }
});

module.exports = router;