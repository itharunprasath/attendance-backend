const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in .env file');
      console.log('💡 Please create backend/.env file with MONGODB_URI');
      process.exit(1);
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.log('\n📋 Troubleshooting:');
    console.log('1. Check if MongoDB is running');
    console.log('2. Verify MONGODB_URI in backend/.env file');
    console.log('3. For MongoDB Atlas: Whitelist your IP address');
    console.log('   https://www.mongodb.com/docs/atlas/security-whitelist/');
    console.log('4. For local MongoDB: Use mongodb://localhost:27017/attendance_system');
    console.log('\n⚠️  Server will continue but database operations will fail.\n');
    // Don't exit - let server start so user can see the error
    // process.exit(1);
  }
};

module.exports = connectDB;

