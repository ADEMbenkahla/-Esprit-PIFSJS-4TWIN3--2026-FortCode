const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let mongoURI = process.env.MONGO_URI;
    
    if (!mongoURI) {
      console.error('MONGO_URI is not defined');
      if (process.env.NODE_ENV !== 'test') process.exit(1);
      return;
    }
    
    if (process.env.NODE_ENV === 'test') {
      console.log('Test mode: connecting to test database');
    }
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log("MongoDB connected");
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error(error);
      process.exit(1);
    } else {
      console.log('Test mode: database connection failed, continuing...');
    }
  }
};

module.exports = connectDB;