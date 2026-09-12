import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from './models/User.js';
import Library from './models/Library.js';
import Seat from './models/Seat.js';
import Booking from './models/Booking.js';

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🌱 Connected to MongoDB for seeding...');

    // Clear existing mock data
    await Promise.all([
      User.deleteMany({}),
      Library.deleteMany({}),
      Seat.deleteMany({}),
      Booking.deleteMany({})
    ]);
    console.log('🧹 Cleaned existing collections.');

    // 1. Create Owner & Student Users
    const hashedPassword = await bcrypt.hash('password123', 10);

    const owner = await User.create({
      name: 'Ramesh Sharma',
      phone: '9876543210',
      email: 'owner@example.com',
      password: hashedPassword,
      role: 'owner',
      isVerified: true
    });

    const student = await User.create({
      name: 'Aarav Patel',
      phone: '9123456780',
      email: 'student@example.com',
      password: hashedPassword,
      role: 'user',
      isVerified: true
    });

    console.log('👤 Created Owner & Student test accounts.');

    // 2. Create Sample Library
    const library = await Library.create({
      owner: owner._id,
      name: 'Peace & Focus Study Hub',
      description: 'Air-conditioned silent study zone with ergonomic chairs, 300 Mbps fiber Wi-Fi, and private discussion cabins.',
      address: {
        street: '42, Vidya Vihar, Near Metro Station',
        locality: 'Sector 62',
        city: 'Noida',
        pincode: '201301',
        location: {
          type: 'Point',
          coordinates: [77.3649, 28.6280] // [longitude, latitude]
        }
      },
      amenities: ['wifi', 'ac', 'power_socket', 'locker', 'silent_zone', 'ro_water'],
      shifts: [
        { name: 'Morning Shift', startTime: '06:00', endTime: '14:00', price: 900 },
        { name: 'Evening Shift', startTime: '14:00', endTime: '22:00', price: 900 },
        { name: 'Full Day Pass', startTime: '06:00', endTime: '22:00', price: 1500 }
      ],
      photos: [
        'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80'
      ],
      rules: [
        'Maintain absolute silence in zone A & B',
        'Phone calls only permitted in the cafeteria area',
        'Outside food not allowed inside reading halls'
      ],
      isActive: true
    });

    console.log(`📚 Created Library: "${library.name}"`);

    // 3. Generate 20 Desks for this Library
    const seats = [];
    for (let i = 1; i <= 20; i++) {
      seats.push({
        library: library._id,
        seatNumber: `A-${i.toString().padStart(2, '0')}`,
        type: i <= 4 ? 'cabin' : i > 16 ? 'corner' : 'regular',
        hasSocket: true,
        hasLocker: i <= 8,
        isActive: true
      });
    }

    const createdSeats = await Seat.insertMany(seats);
    console.log(`🪑 Created ${createdSeats.length} seats.`);

    console.log('\n================ SEED SUMMARY ================');
    console.log(`Owner Phone:    9876543210  | Password: password123`);
    console.log(`Student Phone:  9123456780  | Password: password123`);
    console.log(`Library ID:     ${library._id}`);
    console.log(`Morning Shift:  ${library.shifts[0]._id}`);
    console.log(`Sample Seat ID: ${createdSeats[0]._id}`);
    console.log('==============================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();