const { ObjectId } = require('mongodb');
const { db } = require('./swizzle-db');

function getUidFromInput(input){
    if(input._id){
        return ObjectId(input._id);
    }
    return typeof uid === 'string' ? ObjectId(uid) : uid;
}

function getUser(uid) {
    const uidObject = getUidFromInput(uid);
    const user = db.collection('_swizzle_users').findOne({ _id: uidObject });
    return user;
}

function getUserSubscription(uid) {
    const uidObject = getUidFromInput(uid);
    const user = db.collection('_swizzle_users').findOne({ _id: uidObject });
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
        const uidObject = getUidFromInput(uid);
        const state = isSubscribed ? (willRenew ? "subscribed" : "churned") : "canceled"
        const subscriptionStringState = state + "_" + productId
        const users = db.collection('_swizzle_users');
        await users.updateOne({ _id: uidObject }, { $set: { "subscription": subscriptionStringState } }, { upsert: true });
        return true
    } catch(err){
        console.log(err)
        return false
    }
}

function editUser(uid, newUserProperties) {
    const uidObject = getUidFromInput(uid);
    var filteredProperties = newUserProperties
    delete filteredProperties._id
    delete filteredProperties.createdAt
    filteredProperties.updatedAt = new Date()
    delete filteredProperties.isAnonymous
    delete filteredProperties.lastLoginIp
    delete filteredProperties.subscription
    return db.collection('_swizzle_users').updateOne({ _id: uidObject }, { $set: filteredProperties }, { upsert: true });
}

module.exports = { getUser, getUserSubscription, editUser, setUserSubscription };