const express = require('express');
const { db } = require('./swizzle-db');
const { UID } = require('./swizzle-db-connection');
const router = express.Router();
import { decodeNotificationPayload, isDecodedNotificationDataPayload, isDecodedNotificationSummaryPayload } from "app-store-server-api"

router.post('/apple-receipt', async (request, result) => {
    try{
        const signedPayload = request.body.signedPayload;
        const payload = await decodeNotificationPayload(signedPayload)
        if (isDecodedNotificationDataPayload(payload)) {
            const data = payload.data;
            const transactionInfo = await decodeTransaction(data.signedTransactionInfo)
            const renewalInfo = await decodeRenewalInfo(data.signedRenewalInfo)

            const userId = transactionInfo.appAccountToken
            const productId = transactionInfo.productId

            await handleIncomingAppleMessage(payload, userId, productId);
            return result.status(200).send({message: "Notification received"});
        }
        
        if (isDecodedNotificationSummaryPayload(payload)) {
            //Not implemented yet
            //This is called when the developer extends the subscription for all users
            return result.status(200).send({message: "Notification received"});
        }
          
    } catch (err) {
        console.error(err.message);
        result.status(500).send({error: "Couldn't parse Apple notification"});
    }
});

async function updateUserSubscription(userId, state){
  const users = db.collection('_swizzle_users');
  await users.updateOne({ _id: UID(userId) }, { $set: { "_swizzle_subscription": state } }, { upsert: true });
  return;
}

async function handleIncomingAppleMessage(payload, userId, productId){
    const notification_type = payload.notificationType;
    const subtype = payload.subtype;
    
    switch(notification_type) {
        case 'PRICE_INCREASE':
          if (subtype === 'ACCEPTED') {
            return updateUserSubscription(userId, 'subscribed_'+productId);
          } else if (subtype === 'PENDING') {
            return updateUserSubscription(userId, 'subscribed_'+productId);
          }
          break;
          
        case 'DID_CHANGE_RENEWAL_STATUS':
          if (subtype === 'AUTO_RENEW_DISABLED') {
            return updateUserSubscription(userId, 'canceled');
          } else if (subtype === 'AUTO_RENEW_ENABLED') {
            return updateUserSubscription(userId, 'subscribed_'+productId);
          }
          break;
    
        case 'DID_RENEW':
          if (subtype === 'BILLING_RECOVERY') {
            return updateUserSubscription(userId, 'subscribed_'+productId);
          }
          break;
    
        case 'EXPIRED':
          if (subtype === 'BILLING_RETRY') {
            return updateUserSubscription(userId, 'canceled');
          } else if (subtype === 'PRICE_INCREASE') {
            return updateUserSubscription(userId, 'canceled');
          } else if (subtype === 'PRODUCT_NOT_FOR_SALE') {
            return updateUserSubscription(userId, 'canceled');
          } else if (subtype === 'VOLUNTARY') {
            return updateUserSubscription(userId, 'canceled');
          }
          break;
    
        case 'DID_CHANGE_RENEWAL_PREF':
          if (subtype === 'DOWNGRADE') {
            return updateUserSubscription(userId, 'subscribed_'+productId);
          } else if (subtype === 'UPGRADE') {
            return updateUserSubscription(userId, 'subscribed_'+productId);
          }
          break;
    
        case 'RENEWAL_EXTENSION': //App Store is attempting to extend the subscription renewal date that you request by calling Extend Subscription Renewal Dates for All Active Subscribers.
          if (subtype === 'FAILURE') {
            // Handle failure
          } else if (subtype === 'SUMMARY') {
            // Handle summary
          }
          break;
    
        case 'DID_FAIL_TO_RENEW':
          if (subtype === 'GRACE_PERIOD') {
            return updateUserSubscription(userId, 'canceled');
          }
          break;
    
        case 'SUBSCRIBED':
          if (subtype === 'INITIAL_BUY') {
            return updateUserSubscription(userId, 'subscribed_'+productId);
          } else if (subtype === 'RESUBSCRIBE') {
            return updateUserSubscription(userId, 'subscribed_'+productId);
          }
          break;
    
        default:
          return;
      }    

      return;
}

export default router;