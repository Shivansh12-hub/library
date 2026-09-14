import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/apiResponse.js';

// Keep your existing authenticate / verifyToken middleware above, then export this:
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Forbidden: Role '${req.user?.role || "unknown"}' is not authorized to access this resource`
        )
      );
    }
    next();
  };
};

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