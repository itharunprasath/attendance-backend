const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { generateQRCode, validateQRTimestamp } = require('../utils/qrGenerator');
const { generatePDFReport, generateCSVReport, cleanupCSVFile } = require('../utils/exportUtils');
const fs = require('fs');

// @desc    Create a new session
// @route   POST /api/teacher/sessions
// @access  Private (Teacher only)
exports.createSession = async (req, res) => {
  try {
    const { subject, date, startTime, endTime, duration } = req.body;

    if (!subject || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    const session = await Session.create({
      teacherId: req.user.id,
      subject,
      date: new Date(date),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration: duration || 30,
    });

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update session location
// @route   PATCH /api/teacher/sessions/:sessionId/location
// @access  Private (Teacher only)
exports.updateSessionLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid latitude and longitude',
      });
    }

    const session = await Session.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (session.teacherId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this session',
      });
    }

    session.location = { lat, lng };
    await session.save();

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all sessions for teacher
// @route   GET /api/teacher/sessions
// @access  Private (Teacher only)
exports.getSessions = async (req, res) => {
  try {
    const now = new Date();
    await Session.updateMany(
      {
        teacherId: req.user.id,
        status: 'active',
        endTime: { $lte: now },
      },
      {
        $set: { status: 'ended' },
      }
    );

    const sessions = await Session.find({ teacherId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('teacherId', 'name email');

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single session
// @route   GET /api/teacher/sessions/:sessionId
// @access  Private (Teacher only)
exports.getSession = async (req, res) => {
  try {
    let session = await Session.findById(req.params.sessionId).populate('teacherId', 'name email');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Check if session belongs to teacher
    if (session.teacherId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this session',
      });
    }

    if (session.status === 'active' && new Date() >= new Date(session.endTime)) {
      session.status = 'ended';
      await session.save();
    }

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update session
// @route   PUT /api/teacher/sessions/:sessionId
// @access  Private (Teacher only)
exports.updateSession = async (req, res) => {
  try {
    let session = await Session.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Check if session belongs to teacher
    if (session.teacherId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this session',
      });
    }

    session = await Session.findByIdAndUpdate(req.params.sessionId, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete session
// @route   DELETE /api/teacher/sessions/:sessionId
// @access  Private (Teacher only)
exports.deleteSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Check if session belongs to teacher
    if (session.teacherId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this session',
      });
    }

    // Delete associated attendance records
    await Attendance.deleteMany({ sessionId: req.params.sessionId });

    await Session.findByIdAndDelete(req.params.sessionId);

    res.status(200).json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Generate QR code for session
// @route   POST /api/teacher/sessions/:sessionId/generate-qr
// @access  Private (Teacher only)
exports.generateQR = async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Check if session belongs to teacher
    if (session.teacherId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to generate QR for this session',
      });
    }

    // Update location if provided
    if (req.body.location) {
      session.location = {
        lat: req.body.location.lat,
        lng: req.body.location.lng,
      };
    }

    // Generate QR code
    const timestamp = Date.now();
    const { qrCode, qrData } = await generateQRCode(session._id, session.teacherId, timestamp);

    session.qrCode = qrCode;
    await session.save();

    res.status(200).json({
      success: true,
      data: {
        qrCode,
        qrData,
        timestamp,
        sessionId: session._id,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get attendance for a session
// @route   GET /api/teacher/sessions/:sessionId/attendance
// @access  Private (Teacher only)
exports.getSessionAttendance = async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Check if session belongs to teacher
    if (session.teacherId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this session attendance',
      });
    }

    const attendance = await Attendance.find({ sessionId: req.params.sessionId })
      .populate('studentId', 'name email rollNumber')
      .sort({ markedAt: -1 });

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance.map((att) => ({
        _id: att._id,
        studentId: att.studentId._id,
        studentName: att.studentId.name,
        studentEmail: att.studentId.email,
        studentRollNumber: att.studentId.rollNumber,
        status: att.status,
        markedAt: att.markedAt,
        distance: att.distance,
        requestStatus: att.requestStatus,
        location: att.location,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all attendance reports
// @route   GET /api/teacher/attendance/reports
// @access  Private (Teacher only)
exports.getAttendanceReports = async (req, res) => {
  try {
    const sessions = await Session.find({ teacherId: req.user.id }).sort({ createdAt: -1 });

    const reports = await Promise.all(
      sessions.map(async (session) => {
        const attendance = await Attendance.find({ sessionId: session._id })
          .populate('studentId', 'name email rollNumber');

        return {
          session: {
            _id: session._id,
            subject: session.subject,
            date: session.date,
            startTime: session.startTime,
            endTime: session.endTime,
          },
          attendance: attendance.map((att) => ({
            _id: att._id,
            studentId: att.studentId._id,
            studentName: att.studentId.name,
            studentEmail: att.studentId.email,
            studentRollNumber: att.studentId.rollNumber,
            status: att.status,
            markedAt: att.markedAt,
            distance: att.distance,
            requestStatus: att.requestStatus,
          })),
          totalStudents: attendance.length,
          presentCount: attendance.filter((a) => a.status === 'present').length,
          absentCount: attendance.filter((a) => a.status === 'absent').length,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update attendance manually
// @route   PUT /api/teacher/attendance/:attendanceId
// @access  Private (Teacher only)
exports.updateAttendance = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['present', 'absent'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid status (present or absent)',
      });
    }

    const attendance = await Attendance.findById(req.params.attendanceId).populate('sessionId');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }

    // Check if attendance belongs to teacher's session
    if (attendance.teacherId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this attendance',
      });
    }

    attendance.status = status;
    attendance.requestStatus = 'teacher-updated';
    attendance.updatedAt = new Date();
    await attendance.save();

    res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Export attendance as PDF
// @route   GET /api/teacher/attendance/export/pdf/:sessionId
// @access  Private (Teacher only)
exports.exportPDF = async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (session.teacherId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to export this session',
      });
    }

    const attendance = await Attendance.find({ sessionId: req.params.sessionId })
      .populate('studentId', 'name email');

    const attendanceList = attendance.map((att) => ({
      studentName: att.studentId.name,
      status: att.status,
      distance: att.distance,
      markedAt: att.markedAt,
    }));

    const pdfBuffer = await generatePDFReport(session, attendanceList);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${session._id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Export attendance as CSV
// @route   GET /api/teacher/attendance/export/csv/:sessionId
// @access  Private (Teacher only)
exports.exportCSV = async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (session.teacherId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to export this session',
      });
    }

    const attendance = await Attendance.find({ sessionId: req.params.sessionId })
      .populate('studentId', 'name email');

    const attendanceList = attendance.map((att) => ({
      studentName: att.studentId.name,
      studentEmail: att.studentId.email,
      status: att.status,
      distance: att.distance,
      markedAt: att.markedAt,
      requestStatus: att.requestStatus,
    }));

    const csvPath = await generateCSVReport(session, attendanceList);

    res.download(csvPath, `attendance_${session._id}.csv`, (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error downloading file',
        });
      }
      // Clean up file after download
      cleanupCSVFile(csvPath);
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

