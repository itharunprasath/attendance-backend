const PDFDocument = require('pdfkit');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');

/**
 * Generate PDF report for attendance
 * @param {object} session - Session object
 * @param {array} attendanceList - List of attendance records
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generatePDFReport(session, attendanceList) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Attendance Report', { align: 'center' });
      doc.moveDown();

      // Session Details
      doc.fontSize(14).text('Session Details:', { underline: true });
      doc.fontSize(12);
      doc.text(`Subject: ${session.subject}`);
      doc.text(`Date: ${new Date(session.date).toLocaleDateString()}`);
      doc.text(`Time: ${new Date(session.startTime).toLocaleTimeString()} - ${new Date(session.endTime).toLocaleTimeString()}`);
      doc.moveDown();

      // Attendance Table Header
      doc.fontSize(14).text('Attendance List:', { underline: true });
      doc.moveDown(0.5);

      // Table headers
      const tableTop = doc.y;
      doc.fontSize(10);
      doc.text('Student Name', 50, tableTop);
      doc.text('Status', 200, tableTop);
      doc.text('Distance (m)', 280, tableTop);
      doc.text('Marked At', 360, tableTop);

      // Draw line
      doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
      doc.moveDown();

      // Attendance rows
      attendanceList.forEach((attendance, index) => {
        const y = doc.y;
        doc.text(attendance.studentName || 'N/A', 50, y);
        doc.text(attendance.status.toUpperCase(), 200, y);
        doc.text(attendance.distance ? `${attendance.distance}m` : 'N/A', 280, y);
        doc.text(new Date(attendance.markedAt).toLocaleString(), 360, y);
        doc.moveDown(0.5);

        // Draw line between rows
        if (index < attendanceList.length - 1) {
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.5);
        }
      });

      // Summary
      doc.moveDown();
      const presentCount = attendanceList.filter((a) => a.status === 'present').length;
      const absentCount = attendanceList.filter((a) => a.status === 'absent').length;
      doc.fontSize(12).text(`Summary: ${presentCount} Present, ${absentCount} Absent`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate CSV report for attendance
 * @param {object} session - Session object
 * @param {array} attendanceList - List of attendance records
 * @returns {Promise<string>} CSV file path
 */
async function generateCSVReport(session, attendanceList) {
  const csvPath = path.join(__dirname, '../temp', `attendance_${session._id}_${Date.now()}.csv`);

  // Ensure temp directory exists
  const tempDir = path.dirname(csvPath);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const csvWriter = createCsvWriter({
    path: csvPath,
    header: [
      { id: 'studentName', title: 'Student Name' },
      { id: 'email', title: 'Email' },
      { id: 'status', title: 'Status' },
      { id: 'distance', title: 'Distance (m)' },
      { id: 'markedAt', title: 'Marked At' },
      { id: 'requestStatus', title: 'Request Status' },
    ],
  });

  const records = attendanceList.map((attendance) => ({
    studentName: attendance.studentName || 'N/A',
    email: attendance.studentEmail || 'N/A',
    status: attendance.status.toUpperCase(),
    distance: attendance.distance || 'N/A',
    markedAt: new Date(attendance.markedAt).toLocaleString(),
    requestStatus: attendance.requestStatus || 'N/A',
  }));

  await csvWriter.writeRecords(records);
  return csvPath;
}

/**
 * Clean up temporary CSV files
 * @param {string} filePath - Path to CSV file
 */
function cleanupCSVFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = {
  generatePDFReport,
  generateCSVReport,
  cleanupCSVFile,
};

