const express = require('express');
const router = express.Router();
const { scanQR, getMyAttendance, requestAttendance, getProfile, updateProfile } = require('../controllers/studentController');
const { protect } = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// All routes require authentication and student role
router.use(protect);
router.use(checkRole('student'));

router.post('/scan', scanQR);
router.get('/attendance', getMyAttendance);
router.post('/attendance/request', requestAttendance);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

module.exports = router;

