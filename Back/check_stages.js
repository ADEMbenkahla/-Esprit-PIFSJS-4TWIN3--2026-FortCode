const mongoose = require('mongoose');
const Stage = require('./src/models/Stage');
require('dotenv').config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const stages = await Stage.find();
    console.log(`Total Stages: ${stages.length}`);
    stages.forEach(s => {
      console.log(`- Title: ${s.title} | Category: ${s.category}`);
    });
    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
}
check();
