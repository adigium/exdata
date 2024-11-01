import mongoose from 'mongoose';

export const connectDatabase = async (mongoUri: string) => {
  try {
    await mongoose.connect(mongoUri, {});
    console.log('Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('Error connecting to MongoDB', error);
    process.exit(1); // Exit with failure
  }
};
