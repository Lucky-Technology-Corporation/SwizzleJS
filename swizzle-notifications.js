const { ObjectId } = require('mongodb');
const { getDb } = require('./swizzle-db-connection');
const secrets = require('./swizzle-secrets');

var apn = require('apn');
var provider = undefined;
var notificationBundleId = undefined;

function setupNotifications() {
    const keySecret = secrets.get('SWIZZLE_APPLE_NOTIFICATION_KEY');
    if (!keySecret) {
        return new Error('Error initializing notifications - no key set. Please make sure to upload your notification key info on the Swizzle dashboard.');
    }

    const [base64Key, keyId, teamId, bundleId] = keySecret.split(',');
    if (!base64Key || !keyId || !teamId) {
        return new Error('[Internal Error] Malformed secret.');
    }

    // Decoding base64 encoded p8 key and writing it to a temp file
    const key = Buffer.from(base64Key, 'base64').toString('utf8');

    var options = {
        token: {
            key,
            keyId,
            teamId,
        },
        production: process.env.SWIZZLE_ENV === 'prod'
    };

    provider = new apn.Provider(options);
    notificationBundleId = bundleId;
}

async function sendNotification(user, title, body, badge) {
    var badgeNumber = 0
    if(badge){ badgeNumber = badge }

    const notification = new apn.Notification({
        alert: {
          title: title,
          body: body,
        },
        badge: badgeNumber,
        topic: notificationBundleId
    });
    sendNotificationHelper(user, notification);
}

async function sendNotificationHelper(user, notification) {
    if (!provider) {
        return Promise.reject(new Error('Make sure to call setupNotifications before sending any notifications.'));
    }

    if (typeof user === 'string' || user instanceof ObjectId) {
        const db = getDb();
        try {
            user = await db.collection('_swizzle_users').findOne({ _id: new ObjectId(user) });
        } catch (err) {
            return Promise.reject(new Error('Couldn\'t send notification. User: ' + user + ' couldn\'t be found in the DB'));
        }
    } else if (typeof user !== 'object') {
        return Promise.reject(new Error('User must be either a string, mongo ID, or an object.'));
    }

    if (!user.deviceToken) {
        return Promise.reject(new Error('User object doesn\'t have a valid deviceToken set.'));
    }

    return provider.send(notification, user.deviceToken)
}

module.exports = { setupNotifications, sendNotification };