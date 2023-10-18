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

async function getUserSubscription(uid) {
    const uidObject = getUidFromInput(uid);
    const user = await db.collection('_swizzle_users').findOne({ _id: uidObject });
    if(user.subscription && user.subscription.contains("subscribed_")){
        return {
            isSubscribed: true,
            willRenew: false,
            productId: user.subscription.split("_")[1]
        }
    } else if(user.subscription && user.subscription.contains("churned_")){
        return {
            isSubscribed: true,
            willRenew: false,
            productId: user.subscription.split("_")[1]
        }
    } else{
        return {
            isSubscribed: false,
            willRenew: false,
            productId: null
        }
    }
}

async function setUserSubscription(uid, productId, isSubscribed, willRenew) {
    try{
        const uidObject = UID(uid);
        const state = isSubscribed ? (willRenew ? "subscribed" : "churned") : "canceled"
        const subscriptionStringState = state + "_" + productId
        const users = db.collection('_swizzle_users');
        var updatedUser = await users.updateOne({ _id: uidObject }, { $set: { "subscription": subscriptionStringState } }, { upsert: true, returnDocument: 'after' });
        updatedUser = addUserIdToUser(updatedUser)
        return updatedUser;
    } catch(err){
        console.log(err)
        return false
    }
}

async function editUser(uid, newUserProperties) {
    const uidObject = UID(uid);
    var filteredProperties = newUserProperties
    delete filteredProperties._id
    delete filteredProperties.createdAt
    filteredProperties.updatedAt = new Date()
    delete filteredProperties.isAnonymous
    delete filteredProperties.lastLoginIp
    delete filteredProperties.subscription
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
    const users = db.collection('_swizzle_users');  
    const result = await users.insertOne(filteredProperties);
    var newUser = result.ops[0]
    newUser = addUserIdToUser(newUser)
    return newUser;
}

module.exports = { getUser, getUserSubscription, editUser, setUserSubscription, createUser, searchUsers };