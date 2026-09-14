import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/deskplatform";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const adminPhone = "9999999999";
    const existingAdmin = await User.findOne({ phone: adminPhone });

    if (existingAdmin) {
      existingAdmin.role = "admin";
      await existingAdmin.save();
      console.log(`Admin account already exists for ${adminPhone}. Role ensured as 'admin'.`);
    } else {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const admin = await User.create({
        name: "Platform Super Admin",
        phone: adminPhone,
        email: "admin@deskplatform.com",
        password: hashedPassword,
        role: "admin",
        isActive: true,
      });
      console.log("Super Admin seeded successfully:", admin.phone);
    }

    process.exit(0);
  } catch (error) {
    console.error("Failed to seed Super Admin:", error.message);
    process.exit(1);
  }
};

seedSuperAdmin();