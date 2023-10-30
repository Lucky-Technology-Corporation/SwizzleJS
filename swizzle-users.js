const { db } = require('./swizzle-db');
const { UID } = require('./swizzle-db-connection');

function addUserIdToUser(user){
    return {...user, userId: user._id.toString()}
}

async function getUser(uid) {
    const uidObject = UID(uid);
    var user = await db.collection('_swizzle_users').findOne({ _id: uidObject });
    user = addUserIdToUser(user)
    return user;
}

async function searchUsers(query) {
    var users = await db.collection('_swizzle_users').find(query).toArray();
    users = users.map(addUserIdToUser)
    return users;
}

function signTokens(uid, hours){
    var safeHours = hours || 24
    const accessToken = jwt.sign({ userId: uid }, process.env.SWIZZLE_JWT_SECRET_KEY, { expiresIn: safeHours+'h' });
    const refreshToken = jwt.sign({ userId: uid }, process.env.SWIZZLE_REFRESH_JWT_SECRET_KEY);
    return { accessToken, refreshToken }
}

function refreshTokens(refreshToken){
    try {
        const { userId } = jwt.verify(refreshToken, process.env.SWIZZLE_REFRESH_JWT_SECRET_KEY);
        const { accessToken, refreshToken } = signTokens(userId)
        return { accessToken, refreshToken }
    } catch (err) {
        console.log(err)
        return null
    }
}

async function editUser(uid, newUserProperties) {
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

async function createUser(properties, request){
    var ip;
    if(request){
        ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress;
    }
    var filteredProperties = { createdAt: new Date(), updatedAt: new Date()}
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

module.exports = { getUser, editUser, createUser, searchUsers, signTokens, refreshTokens };