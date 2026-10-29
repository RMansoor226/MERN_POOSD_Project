const mongoose = require('mongoose');
const { Schema } = mongoose;

const STATUSES = ['enrolled', 'waitlisted', 'dropped', 'withdrawn', 'completed'];

const enrollmentSchema = new Schema(
  {
    studentId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'studentId is required']
    },
    sectionId: {
        type: Schema.Types.ObjectId,
        ref: 'Section',
        required: [true, 'sectionId is required']
    },
    // courseId and termId are copied from the Section so audits avoid a join
    courseId: {
        type: Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'courseId is required']
    },
    termId: {
        type: Schema.Types.ObjectId,
        ref: 'Term',
        required: [true, 'termId is required']
    },
    status: {
        type: String,
        required: [true, 'status is required'],
        enum: STATUSES
    },
    waitlistedAt: Date, // queue order among status:'waitlisted'
    enrolledAt: Date,
    grade: {
        type: String,
        trim: true
    }, // set when completed
    source: {
        type: String,
        enum: ['registered', 'transfer', 'ap'],
        default: 'registered'
    }
  },
  { collection: 'enrollments', timestamps: true, versionKey: false }
);

enrollmentSchema.index({ studentId: 1, sectionId: 1 }, { unique: true });
enrollmentSchema.index({ sectionId: 1, status: 1, waitlistedAt: 1 });
enrollmentSchema.index({ studentId: 1, status: 1 });
enrollmentSchema.index({ studentId: 1, courseId: 1 });

enrollmentSchema.pre('validate', function () {
  if (this.status === 'waitlisted' && !this.waitlistedAt) this.waitlistedAt = new Date();
  if (this.status === 'enrolled' && !this.enrolledAt) this.enrolledAt = new Date();
  if (this.status === 'completed' && !this.grade) {
    this.invalidate('grade', 'grade is required when status is completed');
  }
});

module.exports = mongoose.model('Enrollment', enrollmentSchema);
module.exports.STATUSES = STATUSES;
