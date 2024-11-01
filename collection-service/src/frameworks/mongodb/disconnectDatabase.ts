import mongoose from 'mongoose';

export const disconnectDatabase = async () => {
  try {
    await mongoose.disconnect();
    return true;
  } catch (error) {
    return false;
  }
};
