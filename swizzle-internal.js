const express = require('express');
const router = express.Router();
const passport = require('passport');

router.get('/ping', passport.authenticate('jwt', { session: false }), async (request, result) => {
    console.log("pinging...")
    return result.json({"message": "pong"});
});

router.post('/ping', passport.authenticate('jwt', { session: false }), async (request, result) => {
    return result.json({"message": request.body.message});
});

router.get('/time', async (request, result) => {
    return result.send(new Date().toString());
});

module.exports = router;
