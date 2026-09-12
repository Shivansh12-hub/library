import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError, asyncHandler } from '../utils/apiResponse.js';

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, phone: user.phone },
    process.env.JWT_SECRET || 'secret_key',
    { expiresIn: process.env.JWT_EXPIRY || '30d' }
  );
};

// Explicit User / Owner Registration
export const register = asyncHandler(async (req, res, next) => {
  const { name, phone, email, password, role } = req.body;

  // Prevent users from granting themselves admin access
  const assignedRole = role === 'owner' ? 'owner' : 'user';

  const existing = await User.findOne({
    $or: [{ phone }, ...(email ? [{ email }] : [])]
  });

  if (existing) {
    return next(new ApiError(409, 'User with this phone or email already exists'));
  }

  const user = await User.create({
    name,
    phone,
    email,
    password,
    role: assignedRole
  });

  const token = generateToken(user);

  res.status(201).json({
    success: true,
    message: `${assignedRole} registered successfully`,
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role
      }
    }
  });
});

// Explicit Login
export const login = asyncHandler(async (req, res, next) => {
  const { identifier, password } = req.body; // Can be phone or email

  const user = await User.findOne({
    $or: [{ phone: identifier }, { email: identifier?.toLowerCase() }]
  }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return next(new ApiError(401, 'Invalid phone/email or password'));
  }

  const token = generateToken(user);

  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role
      }
    }
  });
});