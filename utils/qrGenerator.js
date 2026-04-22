const QRCode = require('qrcode');

/**
 * Generate QR code data URL for a session
 * @param {string} sessionId - Session ID
 * @param {string} teacherId - Teacher ID
 * @param {number} timestamp - Timestamp
 * @returns {Promise<string>} QR code data URL
 */
async function generateQRCode(sessionId, teacherId, timestamp) {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const qrData = `${baseUrl}/scan?sessionId=${sessionId}&teacherId=${teacherId}&timestamp=${timestamp}`;

  try {
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      width: 300,
    });

    return {
      qrCode: qrCodeDataUrl,
      qrData: qrData,
    };
  } catch (error) {
    throw new Error(`QR code generation failed: ${error.message}`);
  }
}

/**
 * Validate QR code timestamp against session time limit
 * @param {Date} sessionStartTime - Session start time
 * @param {number} duration - Session duration in minutes
 * @param {number} qrTimestamp - Timestamp from QR code
 * @returns {boolean} True if QR is still valid
 */
function validateQRTimestamp(sessionStartTime, duration, qrTimestamp) {
  const sessionEndTime = new Date(sessionStartTime.getTime() + duration * 60 * 1000);
  const qrTime = new Date(qrTimestamp);
  const now = new Date();

  // QR timestamp should be within session time and not expired
  return qrTime >= sessionStartTime && qrTime <= sessionEndTime && now <= sessionEndTime;
}

module.exports = {
  generateQRCode,
  validateQRTimestamp,
};

