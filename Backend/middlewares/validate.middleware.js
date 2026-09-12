import { ApiError } from '../utils/apiResponse.js';

export const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errorDetails = error.details.map((detail) => detail.message).join(', ');
    return next(new ApiError(400, errorDetails));
  }

  req[source] = value;
  next();
};