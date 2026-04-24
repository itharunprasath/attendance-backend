const express = require('express');
const router = express.Router();
const {
  createSession,
  getSessions,
  getSession,
  updateSession,
  updateSessionLocation,
  deleteSession,
  generateQR,
  getSessionAttendance,
  getAttendanceReports,
  updateAttendance,
  exportPDF,
  exportCSV,
} = require('../controllers/teacherController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// All routes require authentication and teacher role
router.use(protect);
router.use(checkRole('teacher'));

router.route('/sessions').get(getSessions).post(createSession);
router.route('/sessions/:sessionId').get(getSession).put(updateSession).delete(deleteSession);
router.patch('/sessions/:sessionId/location', updateSessionLocation);
router.post('/sessions/:sessionId/generate-qr', generateQR);
router.get('/sessions/:sessionId/attendance', getSessionAttendance);
router.get('/attendance/reports', getAttendanceReports);
router.put('/attendance/:attendanceId', updateAttendance);
router.get('/attendance/export/pdf/:sessionId', exportPDF);
router.get('/attendance/export/csv/:sessionId', exportCSV);

module.exports = router;

