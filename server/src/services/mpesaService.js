
import axios from "axios";

/**
 * M-PESA ENVIRONMENT
 *
 * sandbox:
 * https://sandbox.safaricom.co.ke
 *
 * production:
 * https://api.safaricom.co.ke
 */
const MPESA_BASE_URL = process.env.MPESA_ENVIRONMENT === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

/**
 * Get M-PESA OAuth access token.
 */
export const getMpesaAccessToken = async () => {
  try {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) {
      throw new Error("M-PESA consumer key or consumer secret is missing.");
    }

    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    const response = await axios.get(
      `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error( "M-PESA ACCESS TOKEN ERROR:", error.response?.data || error.message);

    throw new Error( "Unable to authenticate with M-PESA.");
  }
};

/**
 * Generate the M-PESA STK Push password.
 *
 * Password =
 * Base64(
 *   Shortcode + Passkey + Timestamp
 * )
 */
const generatePassword = (timestamp) => {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;

  if (!shortcode || !passkey) {
    throw new Error( "M-PESA shortcode or passkey is missing.");
  }

  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
};

/**
 * Generate timestamp in:
 *
 * YYYYMMDDHHmmss
 */
const generateTimestamp = () => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String( now.getUTCMonth() + 1 ).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hours = String(now.getUTCHours()).padStart(2, "0");
  const minutes = String( now.getUTCMinutes()).padStart(2, "0");
  const seconds = String(now.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

/**
 * Normalize Kenyan phone numbers.
 *
 * Accepted examples:
 *
 * 0712345678
 * 0112345678
 * +254712345678
 * 254712345678
 *
 * Returns:
 *
 * 254712345678
 */
export const normalizeMpesaPhone = (phoneNumber) => {
  if (!phoneNumber) {
    throw new Error( "M-PESA phone number is required.");
  }

  let phone = String(phoneNumber)
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "");

  /*
   * +254712345678
   */
  if (phone.startsWith("+254")) {
    phone = phone.substring(1);
  }

  /*
   * 0712345678
   * 0112345678
   */
  if (phone.startsWith("07") || phone.startsWith("01")) {
    phone = `254${phone.substring(1)}`;
  }

  /*
   * Basic Kenyan Safaricom number validation.
   *
   * This accepts the common 2547... and 2541...
   * formats.
   */
  if (!/^254[17]\d{8}$/.test(phone)) {throw new Error("Invalid Kenyan M-PESA phone number.");
  }

  return phone;
};

/**
 * Initiate M-PESA STK Push.
 */
export const initiateStkPush = async ({
  amount,
  phoneNumber,
  accountReference,
  transactionDesc,
}) => {
  if (!amount || Number(amount) <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const normalizedPhone = normalizeMpesaPhone(phoneNumber);
  const accessToken = await getMpesaAccessToken();
  const shortcode = process.env.MPESA_SHORTCODE;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;

  if (!shortcode) {
    throw new Error( "M-PESA shortcode is missing.");
  }

  if (!callbackUrl) {
    throw new Error("M-PESA callback URL is missing.");
  }

  const timestamp =generateTimestamp();
  const password = generatePassword(timestamp);
  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(Number(amount)),
    PartyA: normalizedPhone,
    PartyB: shortcode,
    PhoneNumber: normalizedPhone,
    CallBackURL: callbackUrl,
    AccountReference: accountReference || "BARTER-TRADE",
    TransactionDesc: transactionDesc || "Barter Trade Payment",
  };

  try {
    const response = await axios.post(
      `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("M-PESA STK PUSH ERROR:", error.response?.data || error.message);

    throw new Error(
      error.response?.data?.errorMessage ||
        error.response?.data?.ResponseDescription ||
        "Unable to initiate M-PESA payment."
    );
  }
};
