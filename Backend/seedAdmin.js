import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const fixSuperAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/deskplatform";
    await mongoose.connect(mongoUri);

    const admin = await User.findOne({ phone: "9999999999" });

    if (admin) {
      // Set plain text so Mongoose pre-save hook hashes it once (or set password123)
      admin.password = "password123";
      admin.role = "admin";
      admin.isVerified = true;
      await admin.save();
      console.log("Super Admin updated successfully! isVerified: true, password: password123");
    } else {
      await User.create({
        name: "Platform Super Admin",
        phone: "9999999999",
        email: "admin@deskplatform.com",
        password: "password123",
        role: "admin",
        isVerified: true,
      });
      console.log("Super Admin created with password: password123");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

fixSuperAdmin();