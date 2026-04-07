const mongoose = require('mongoose');
const Challenge = require('./src/models/Challenge');

mongoose.connect('mongodb://127.0.0.1:27017/fortcode').then(async () => {
    try {
        const doc = await Challenge.findOne({ title: /Count Character Occurrences/i });
        if (doc) {
            console.log("TEST CASES FOUND:");
            console.log(JSON.stringify(doc.testCases, null, 2));
        } else {
            console.log("Challenge not found in DB.");
        }
    } catch (err) {
        console.error(err);
    } finally {
        mongoose.disconnect();
    }
});
