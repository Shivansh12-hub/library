import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

// Format 10-digit Indian phone numbers to E.164 (+91XXXXXXXXXX)
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  const cleaned = phone.toString().replace(/\D/g, "");
  if (cleaned.length === 10) return `+91${cleaned}`;
  if (cleaned.length === 12 && cleaned.startsWith("91")) return `+${cleaned}`;
  return `+${cleaned}`;
};

const sendSafeSMS = async (to, body) => {
  const formattedTo = formatPhoneNumber(to);
  if (!formattedTo) return;

  if (!client || !fromPhone) {
    console.log(`\n[Simulated SMS to ${formattedTo}]`);
    console.log(`Body: ${body}\n`);
    return;
  }

  try {
    await client.messages.create({
      body,
      from: fromPhone,
      to: formattedTo,
    });
    console.log(`[SMS Sent] Message delivered to ${formattedTo}`);
  } catch (err) {
    console.error(`[SMS Delivery Failed] ${formattedTo}:`, err.message);
  }
};

// 1. Instant Booking SMS
export const sendBookingConfirmationSMS = async ({
  phone,
  userName,
  libraryName,
  seatNumber,
  qrPassCode,
}) => {
  const message = `Hi ${userName}, your desk ${seatNumber} at ${libraryName} is confirmed! Pass code: ${qrPassCode}. Present this or your QR pass at the entrance gate.`;
  await sendSafeSMS(phone, message);
};

// 2. Expiry Warning SMS
export const sendPassExpiryReminderSMS = async ({
  phone,
  userName,
  libraryName,
  seatNumber,
  endDate,
}) => {
  const formattedDate = new Date(endDate).toLocaleDateString();
  const message = `Hi ${userName}, your study pass for Desk ${seatNumber} at ${libraryName} expires on ${formattedDate}. Renew now to avoid seat cancellation.`;
  await sendSafeSMS(phone, message);
};

// 3. Wrapper matching user.controller.js import
export const notifyBookingConfirmed = async ({
  phone,
  userName,
  libraryName,
  seatNumber,
  startDate,
  endDate,
  qrPassCode,
}) => {
  return sendBookingConfirmationSMS({
    phone,
    userName,
    libraryName,
    seatNumber,
    qrPassCode,
  });
};

// 4. Wrapper matching cron/bookingCleanup.js import
export const notifyPassExpiring = async ({
  phone,
  userName,
  libraryName,
  seatNumber,
  endDate,
}) => {
  return sendPassExpiryReminderSMS({
    phone,
    userName,
    libraryName,
    seatNumber,
    endDate,
  });
};