import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌  MONGODB_URI is not set in environment.");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅  MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("❌  MongoDB connection failed:", err.message);
    process.exit(1);
  }

  // Log connection lifecycle events so we notice flapping connections in prod logs.
  // Mongoose automatically tries to reconnect after a disconnect; these just surface it.
  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️   MongoDB disconnected — attempting to reconnect…");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("✅  MongoDB reconnected.");
  });

  mongoose.connection.on("error", (err) => {
    console.error("❌  MongoDB connection error:", err.message);
  });
}
