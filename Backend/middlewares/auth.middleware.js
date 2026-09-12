import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/apiResponse.js';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Unauthorized: Access token missing'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    
    // Normalize user object so both _id and id are accessible
    req.user = {
      ...decoded,
      _id: decoded._id || decoded.id,
    };

    next();
  } catch (err) {
    next(new ApiError(401, 'Unauthorized: Invalid or expired access token'));
  }
};