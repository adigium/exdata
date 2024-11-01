import mongoose from 'mongoose';

export const connectDatabase = async (mongoUri: string) => {
  try {
    await mongoose.connect(mongoUri, {});
    return true;
  } catch (error) {
    process.exit(1);
  }
};
