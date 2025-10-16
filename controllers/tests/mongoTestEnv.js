import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod;

export const connectTestDB = async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri, { dbName: "testdb" });
};

export const clearDB = async () => {
  await mongoose.connection.dropDatabase();
};

export const disconnectTestDB = async () => {
  await mongoose.connection.close();
  if (mongod) await mongod.stop();
};
