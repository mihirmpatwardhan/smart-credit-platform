const mongoose = require('mongoose');

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  const cloudUri = process.env.MONGODB_URI;
  const localUri = 'mongodb://localhost:27017/smartcredit';

  try {
    console.log('Connecting to Cloud MongoDB Atlas...');
    // Set a short timeout for cloud connection so it falls back quickly if blocked
    await mongoose.connect(cloudUri, {
      serverSelectionTimeoutMS: 5000 
    });
    console.log('MongoDB Connected successfully to Cloud Atlas!');
  } catch (error) {
    console.warn('\n⚠️  Cloud MongoDB connection failed (likely IP whitelist block).');
    console.log('🔄 Attempting offline fallback to Local MongoDB...');
    try {
      await mongoose.connect(localUri, {
        serverSelectionTimeoutMS: 3000
      });
      console.log('✅ Connected successfully to Local MongoDB (mongodb://localhost:27017/smartcredit)!');
    } catch (localError) {
      console.error('\n❌ CRITICAL ERROR: Could not connect to Cloud Atlas or Local MongoDB.');
      console.error('💡 To fix this immediately:');
      console.error('   1. Go to MongoDB Atlas -> Network Access.');
      console.error('   2. Click "Add IP Address" -> select "Allow Access From Anywhere" (0.0.0.0/0) -> click Confirm.');
      console.error('   3. Or make sure your local MongoDB service is running.\n');
      process.exit(1);
    }
  }
};

module.exports = connectDB;
