import { Request } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { ObjectId, Sort } from 'mongodb';
import { db } from '.';
import { UID } from './swizzle-db-connection';

export function addUserIdToUser(user: any){
    return {...user, userId: user._id.toString()}
}

export async function getUser(uid: string | ObjectId) {
    const uidObject = UID(uid);
    if(!uidObject){ return null }
    var user = await db.collection('_swizzle_users').findOne({ _id: uidObject });
    if(!user || (user && user._deactivated)){ return null }
    user = addUserIdToUser(user)
    return user;
}

export async function searchUsers(query: object, sort?: Sort, limit?: number) {
    var usersQuery = db.collection('_swizzle_users').find(query)
    if (sort) {
        usersQuery = usersQuery.sort(sort);
    }

    if (limit) {
        usersQuery = usersQuery.limit(limit);
    }
    var users = await usersQuery.toArray();
    users = users.map(addUserIdToUser).filter(user => !user._deactivated)
    return users;
}

export async function signTokens(uid: string, hours: number = 24): Promise<{ accessToken: string; refreshToken: string; } | null> {
    try {
        const secretKey = process.env.SWIZZLE_JWT_SECRET_KEY
        const refreshSecretKey = process.env.SWIZZLE_REFRESH_JWT_SECRET_KEY
        if(!secretKey || !refreshSecretKey){
            return null
        }
        
        const uidObject = UID(uid);
        if(!uidObject){ return null }
        var user = await db.collection('_swizzle_users').findOne({ _id: uidObject });
        if(!user || (user && user._deactivated)){ return null }
        const userObject = addUserIdToUser(user)

        const accessToken = jwt.sign(userObject, secretKey, { expiresIn: `${hours}h` });
        const refreshToken = jwt.sign(userObject, refreshSecretKey);

        return { accessToken, refreshToken }
    } catch (err) {
        console.log(err)
        return null
    }
}

export async function refreshTokens(oldRefreshToken: string, hours: number = 24): Promise<{ accessToken: string; refreshToken: string; } | null>{
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
        
        const newTokens = await signTokens(userId, hours)
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
    if(!uidObject){ return null }
    var filteredProperties = newUserProperties
    delete filteredProperties._id
    delete filteredProperties.createdAt
    filteredProperties.updatedAt = new Date()
    delete filteredProperties.lastLoginIp
    var updatedUser = db.collection('_swizzle_users').findOneAndUpdate({ _id: uidObject }, { $set: filteredProperties }, { upsert: true, returnDocument: 'after' });
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
    const users = db.collection('users');  
    const existingUser = await users.findOne({ email: filteredProperties.email });
    if(existingUser){
        return null
    }
    const result = await users.insertOne(filteredProperties);
    if (result.acknowledged) {
        var newUser = await db.collection('users').findOne({ _id: result.insertedId });
        newUser = addUserIdToUser(newUser)
        return newUser;
    }  
    return null
}
