import express, { NextFunction, Response } from "express";
import { json } from "body-parser";
import { createServer } from "http";
import cors from "cors";
import mongoose from "mongoose";

import config from "./config";

console.log("**********");
console.log("redis", process.env.REDIS_URI);
console.log("mongo", process.env.MONGO_URI);
console.log("jwt secret", config.jwtKey);
console.log("**********");

const app = express();

app.use(json());
app.use(cors());

const server = createServer(app);

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/chat", {
  useFindAndModify: false,
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

import { Schema, model } from "mongoose";
import { natsWrapper } from "./nats-wrapper";

natsWrapper.connect("unichat", "user", "http://localhost:4222").then(() => {
  const options = natsWrapper.client
    .subscriptionOptions()
    .setManualAckMode(true)
    .setDeliverAllAvailable()
    .setDurableName("userService");

  natsWrapper.client.on("close", () => {
    console.log("NATS connection closed");
    process.exit();
  });
  process.on("SIGINT", () => natsWrapper.client.close());
  process.on("SIGTERM", () => natsWrapper.client.close());
});

const UserSchema = new Schema({
  firstName: String,
  phoneNuber: String,
  email: { type: String },
  createdAt: Date,
  updatedAt: Date,
});

UserSchema.post("save", function (user, next) {
  natsWrapper.client.publish("user:updated", JSON.stringify(user), () => {
    console.log("Event user:updated published");
  });
  next();
});

const User = model("User", UserSchema);

app.get("/api/user", async function (req: any, res: any) {
  const user = await User.create({ firstName: Date.now() });
  res.json(user);
});

app.use(function (err: any, req: any, res: any, next: any) {
  if (!err) {
    return next();
  }
  res.status(err.status || 400).send(err);
});

server.listen(4000, () => {
  console.log("Service is listening on port 4000");
});