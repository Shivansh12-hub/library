import Joi from 'joi';

export const createLibrarySchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).required(),
  description: Joi.string().trim().max(1000).allow(''),
  address: Joi.object({
    street: Joi.string().trim().required(),
    locality: Joi.string().trim().required(),
    city: Joi.string().trim().required(),
    pincode: Joi.string().trim().required(),
    location: Joi.object({
      coordinates: Joi.array().items(Joi.number()).length(2).required() // [lng, lat]
    }).required()
  }).required(),
  amenities: Joi.array().items(
    Joi.string().valid('wifi', 'ac', 'power_socket', 'locker', 'cafeteria', 'silent_zone', 'ro_water')
  ).default([]),
  shifts: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
      endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
      price: Joi.number().positive().required()
    })
  ).min(1).required(),
  photos: Joi.array().items(Joi.string().uri()).default([]),
  rules: Joi.array().items(Joi.string().trim()).default([])
});

export const batchCreateSeatsSchema = Joi.object({
  prefix: Joi.string().trim().uppercase().max(5).default('S'),
  totalSeats: Joi.number().integer().min(1).max(300).required(),
  type: Joi.string().valid('regular', 'corner', 'cabin', 'window').default('regular'),
  hasSocket: Joi.boolean().default(true),
  hasLocker: Joi.boolean().default(false)
});

export const walkInBookingSchema = Joi.object({
  seatId: Joi.string().hex().length(24).required(),
  shiftId: Joi.string().hex().length(24).required(),
  userName: Joi.string().trim().min(2).required(),
  userPhone: Joi.string().pattern(/^[0-9]{10}$/).required(),
  bookingType: Joi.string().valid('hourly', 'daily', 'monthly').default('monthly'),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
  amountPaid: Joi.number().min(0).required()
});

export const verifyQrSchema = Joi.object({
  qrPassCode: Joi.string().trim().uppercase().required(),
  type: Joi.string().valid('in', 'out').default('in')
});