/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Convert degrees to radians
 */
function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Verify if student is within specified radius (default 50m) of teacher
 * @param {number} teacherLat - Teacher's latitude
 * @param {number} teacherLng - Teacher's longitude
 * @param {number} studentLat - Student's latitude
 * @param {number} studentLng - Student's longitude
 * @param {number} radius - Radius in meters (default: 50)
 * @returns {object} { isValid: boolean, distance: number }
 */
function verifyLocation(teacherLat, teacherLng, studentLat, studentLng, radius = 50) {
  const distance = calculateDistance(teacherLat, teacherLng, studentLat, studentLng);
  return {
    isValid: distance <= radius,
    distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
  };
}

module.exports = {
  calculateDistance,
  verifyLocation,
};

