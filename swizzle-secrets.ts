var globalSecretObject: any = {}
require('dotenv').config();
import crypto from 'crypto';


function decrypt(privateKeyBase64: any, encryptedSecretBase64: any) {
    try{
        // Skip empty secrets
        if (encryptedSecretBase64 === '') return '';

        // Decode the base64-encoded private key
        const privateKeyPem = Buffer.from(privateKeyBase64, 'base64').toString('utf-8');

        // Decode the base64-encoded secret
        const encodedSecret = Buffer.from(encryptedSecretBase64, 'base64');
        
        // Decrypt the secret using the private key
        const decrypted = crypto.privateDecrypt({
            key: privateKeyPem,
            padding: crypto.constants.RSA_PKCS1_PADDING
        }, encodedSecret);
        
        return decrypted.toString('utf-8');    
    } catch (e) {
        console.log(e)
        throw e
    }
}

(function initialize() {
    const superSecret = process.env.SWIZZLE_SUPER_SECRET;
    const thisEnvironment = process.env.SWIZZLE_ENV || "test";

    const fs = require('fs');
    if (!fs.existsSync("secrets.json")) {
        console.log("No secrets.json file found. Skipping secrets initialization.");
        return
    }

    const secrets = JSON.parse(fs.readFileSync("secrets.json", 'utf8'));

    for(const key in secrets[thisEnvironment]){
        globalSecretObject[key] = process.env[key] = decrypt(superSecret, secrets[thisEnvironment][key]);
    }
})();

const getSecret = (key: any) => {
    return globalSecretObject[key];
};

module.exports = {getSecret, globalSecretObject};