const express = require('express');
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

            handleIncomingAppleMessage(payload);
            return result.status(200).send({message: "Notification received"});
        }
        
        if (isdecodedNotificationSummaryPayload(payload)) {
            //Not implemented yet
            //This is called when the developer extends the subscription for all users
            return result.status(200).send({message: "Notification received"});
        }
          
    } catch (err) {
        console.error(err.message);
        result.status(500).send({error: "Couldn't parse Apple notification"});
    }
});

function handleIncomingAppleMessage(payload){
    const notification_type = payload.notificationType;
    const subtype = payload.subtype;
    
    switch(notification_type) {
        case 'PRICE_INCREASE':
          if (subtype === 'ACCEPTED') {
            // Handle accepted price increase
          } else if (subtype === 'PENDING') {
            // Handle pending price increase
          }
          break;
          
        case 'DID_CHANGE_RENEWAL_STATUS':
          if (subtype === 'AUTO_RENEW_DISABLED') {
            // Handle auto-renew disabled
          } else if (subtype === 'AUTO_RENEW_ENABLED') {
            // Handle auto-renew enabled
          }
          break;
    
        case 'DID_RENEW':
          if (subtype === 'BILLING_RECOVERY') {
            // Handle billing recovery
          }
          break;
    
        case 'EXPIRED':
          if (subtype === 'BILLING_RETRY') {
            // Handle billing retry
          } else if (subtype === 'PRICE_INCREASE') {
            // Handle price increase
          } else if (subtype === 'PRODUCT_NOT_FOR_SALE') {
            // Handle product not for sale
          } else if (subtype === 'VOLUNTARY') {
            // Handle voluntary expiration
          }
          break;
    
        case 'DID_CHANGE_RENEWAL_PREF':
          if (subtype === 'DOWNGRADE') {
            // Handle downgrade
          } else if (subtype === 'UPGRADE') {
            // Handle upgrade
          }
          break;
    
        case 'RENEWAL_EXTENSION':
          if (subtype === 'FAILURE') {
            // Handle failure
          } else if (subtype === 'SUMMARY') {
            // Handle summary
          }
          break;
    
        case 'DID_FAIL_TO_RENEW':
          if (subtype === 'GRACE_PERIOD') {
            // Handle grace period
          }
          break;
    
        case 'SUBSCRIBED':
          if (subtype === 'INITIAL_BUY') {
            // Handle initial buy
          } else if (subtype === 'RESUBSCRIBE') {
            // Handle resubscribe
          }
          break;
    
        default:
          // Handle unknown types
          break;
      }    
}