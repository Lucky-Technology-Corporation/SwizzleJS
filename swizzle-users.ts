const { db } = require('./swizzle-db');
const { UID } = require('./swizzle-db-connection');
import { Request } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

export function addUserIdToUser(user: any){
    return {...user, userId: user._id.toString()}
}

export async function getUser(uid: string | ObjectId) {
    const uidObject = UID(uid);
    var user = await db.collection('_swizzle_users').findOne({ _id: uidObject });
    user = addUserIdToUser(user)
    return user;
}

export async function searchUsers(query: object) {
    var users = await db.collection('_swizzle_users').find(query).toArray();
    users = users.map(addUserIdToUser)
    return users;
}

export function signTokens(uid: string, hours: number = 24): { accessToken: string, refreshToken: string } | null {
    try {
        const secretKey = process.env.SWIZZLE_JWT_SECRET_KEY
        const refreshSecretKey = process.env.SWIZZLE_REFRESH_JWT_SECRET_KEY
        if(!secretKey || !refreshSecretKey){
            return null
        }
        
        const accessToken = jwt.sign({ userId: uid }, secretKey, { expiresIn: `${hours}h` });
        const refreshToken = jwt.sign({ userId: uid }, refreshSecretKey);

        return { accessToken, refreshToken }
    } catch (err) {
        console.log(err)
        return null
    }
}

export function refreshTokens(oldRefreshToken: string, hours: number = 24){
    try {
        const refreshSecretKey = process.env.SWIZZLE_REFRESH_JWT_SECRET_KEY
        if(!refreshSecretKey){
            return null
        }
        const decoded = jwt.verify(oldRefreshToken, refreshSecretKey);

        if (typeof decoded !== 'object' || decoded === null) {
            throw new Error('Invalid token');
        }
        if (!('userId' in decoded)) {
        throw new Error('Token payload does not contain userId');
        }
        const userId = (decoded as JwtPayload & { userId: string }).userId;
        
        const newTokens = signTokens(userId, hours)
        if(!newTokens){
            return null
        }

        return { accessToken: newTokens.accessToken, refreshToken: newTokens.refreshToken }
    } catch (err) {
        console.log(err)
        return null
    }
}

export async function editUser(uid: string | ObjectId, newUserProperties: {[key: string]: any}) {
    const uidObject = UID(uid);
    var filteredProperties = newUserProperties
    delete filteredProperties._id
    delete filteredProperties.createdAt
    filteredProperties.updatedAt = new Date()
    delete filteredProperties.lastLoginIp
    var updatedUser = db.collection('_swizzle_users').updateOne({ _id: uidObject }, { $set: filteredProperties }, { upsert: true, returnDocument: 'after' });
    updatedUser = addUserIdToUser(updatedUser)
    return updatedUser;
}

export async function createUser(properties: {[key: string]: any}, request: Request){
    var ip;
    if(request){
        ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
    }
    var filteredProperties: any = { createdAt: new Date(), updatedAt: new Date()}
    if(properties){
        filteredProperties = {...filteredProperties, ...properties}
    }
    if(ip){
        filteredProperties.lastLoginIp = ip
    }
    filteredProperties.subscription = null
    const users = db.collection('_swizzle_users');  
    const result = await users.insertOne(filteredProperties);
    var newUser = result.ops[0]
    newUser = addUserIdToUser(newUser)
    return newUser;
}