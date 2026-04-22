const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['present', 'absent'],
    default: 'absent',
  },
  markedAt: {
    type: Date,
    default: Date.now,
  },
  location: {
    lat: {
      type: Number,
      default: null,
    },
    lng: {
      type: Number,
      default: null,
    },
  },
  distance: {
    type: Number,
    default: null, // distance in meters from teacher
  },
  requestStatus: {
    type: String,
    enum: ['auto-marked', 'requested', 'teacher-updated'],
    default: 'auto-marked',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure one attendance record per student per session
attendanceSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);

