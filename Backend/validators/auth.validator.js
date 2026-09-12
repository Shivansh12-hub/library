import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).required(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).required()
    .messages({ 'string.pattern.base': 'Phone must be a valid 10-digit number' }),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).max(72).required(),
  role: Joi.string().valid('user', 'owner').default('user')
});

export const loginSchema = Joi.object({
  identifier: Joi.string().required() // Can be phone or email
    .messages({ 'any.required': 'Phone or email is required to login' }),
  password: Joi.string().required()
});