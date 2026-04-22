const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const { verifyLocation } = require('../utils/locationUtils');
const { validateQRTimestamp } = require('../utils/qrGenerator');
const User = require('../models/User');

// @desc    Scan QR code and mark attendance
// @route   POST /api/student/scan
// @access  Private (Student only)
exports.scanQR = async (req, res) => {
  try {
    const { sessionId, teacherId, timestamp, location } = req.body;

    if (!sessionId || !teacherId || !timestamp || !location) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Find session
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Verify teacher matches (handle both string and ObjectId)
    const teacherIdStr = typeof teacherId === 'string' ? teacherId : teacherId.toString();
    if (session.teacherId.toString() !== teacherIdStr) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code - teacher mismatch',
      });
    }

    // Validate QR timestamp
    const isQRValid = validateQRTimestamp(session.startTime, session.duration, timestamp);

    if (!isQRValid) {
      return res.status(400).json({
        success: false,
        message: 'QR code has expired or is invalid',
      });
    }

    // Check if session is active
    if (session.status === 'ended') {
      return res.status(400).json({
        success: false,
        message: 'Session has ended',
      });
    }

    // Verify location (50m radius)
    const locationCheck = verifyLocation(
      session.location.lat,
      session.location.lng,
      location.lat,
      location.lng,
      50
    );

    // Check if attendance already exists
    let attendance = await Attendance.findOne({
      sessionId,
      studentId: req.user.id,
    });

    if (attendance) {
      // Update existing attendance
      attendance.status = locationCheck.isValid ? 'present' : 'absent';
      attendance.location = {
        lat: location.lat,
        lng: location.lng,
      };
      attendance.distance = locationCheck.distance;
      attendance.markedAt = new Date();
      attendance.updatedAt = new Date();
      await attendance.save();
    } else {
      // Create new attendance record
      attendance = await Attendance.create({
        sessionId,
        studentId: req.user.id,
        teacherId: teacherId,
        status: locationCheck.isValid ? 'present' : 'absent',
        location: {
          lat: location.lat,
          lng: location.lng,
        },
        distance: locationCheck.distance,
        requestStatus: 'auto-marked',
      });
    }

    if (locationCheck.isValid) {
      res.status(200).json({
        success: true,
        message: 'Attendance marked successfully',
        data: {
          status: attendance.status,
          distance: attendance.distance,
        },
      });
    } else {
      res.status(200).json({
        success: false,
        message: `You are ${locationCheck.distance}m away from the teacher. Attendance marked as absent.`,
        data: {
          status: attendance.status,
          distance: attendance.distance,
        },
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get student's attendance
// @route   GET /api/student/attendance
// @access  Private (Student only)
exports.getMyAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find({ studentId: req.user.id })
      .populate('sessionId', 'subject date startTime endTime')
      .populate('teacherId', 'name email')
      .sort({ markedAt: -1 });

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance.map((att) => ({
        _id: att._id,
        sessionId: att.sessionId._id,
        subject: att.sessionId.subject,
        date: att.sessionId.date,
        startTime: att.sessionId.startTime,
        endTime: att.sessionId.endTime,
        teacherName: att.teacherId.name,
        teacherEmail: att.teacherId.email,
        status: att.status,
        markedAt: att.markedAt,
        distance: att.distance,
        requestStatus: att.requestStatus,
        rollNumber: req.user.rollNumber,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Request attendance for a session
// @route   POST /api/student/attendance/request
// @access  Private (Student only)
exports.requestAttendance = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide session ID',
      });
    }

    // Find session
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Check if attendance already exists
    let attendance = await Attendance.findOne({
      sessionId,
      studentId: req.user.id,
    });

    if (attendance) {
      // Update request status
      attendance.requestStatus = 'requested';
      attendance.updatedAt = new Date();
      await attendance.save();
    } else {
      // Create new attendance record with requested status
      attendance = await Attendance.create({
        sessionId,
        studentId: req.user.id,
        teacherId: session.teacherId,
        status: 'absent',
        requestStatus: 'requested',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance request submitted successfully',
      data: attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get student profile
// @route   GET /api/student/profile
// @access  Private (Student only)
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber,
        department: user.department,
        dob: user.dob,
        profilePic: user.profilePic,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update student profile (only profilePic and name allowed)
// @route   PUT /api/student/profile
// @access  Private (Student only)
exports.updateProfile = async (req, res) => {
  try {
    const { profilePic, name } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Fields that cannot be changed once set: email, rollNumber, dob, department
    // Only allow updating profilePic and optionally name
    if (profilePic !== undefined) {
      user.profilePic = profilePic;
    }
    if (name !== undefined && name.trim().length > 0) {
      user.name = name;
    }

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber,
        department: user.department,
        dob: user.dob,
        profilePic: user.profilePic,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

