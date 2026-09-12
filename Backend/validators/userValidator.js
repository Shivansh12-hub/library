import Joi from 'joi';

export const loginSchema = Joi.object({
  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({ 'string.pattern.base': 'Phone must be a valid 10-digit number' }),
  name: Joi.string().trim().min(2).max(60).optional(),
  email: Joi.string().email().optional()
});

export const availabilityQuerySchema = Joi.object({
  shiftId: Joi.string().hex().length(24).required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required()
});

export const createBookingSchema = Joi.object({
  libraryId: Joi.string().hex().length(24).required(),
  seatId: Joi.string().hex().length(24).required(),
  shiftId: Joi.string().hex().length(24).required(),
  bookingType: Joi.string().valid('hourly', 'daily', 'monthly').default('monthly'),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
  amountPaid: Joi.number().positive().required()
});