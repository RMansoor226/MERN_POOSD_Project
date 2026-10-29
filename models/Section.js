const mongoose = require('mongoose');
const { Schema } = mongoose;

const DAYS = ['M', 'T', 'W', 'R', 'F', 'S', 'U'];

const meetingSchema = new Schema(
  {
    days: {
        type: [{ type: String, enum: DAYS }],
        validate: { validator: (v) => v.length > 0, message: 'a meeting needs at least one day' }
    },
    // minutes from midnight: 9:30 AM = 570
    startMinute: {
        type: Number,
        required: true,
        min: 0,
        max: 1439
    },
    endMinute: {
        type: Number,
        required: true,
        min: 1,
        max: 1440,
        validate: {
            validator: function (v) {
                return v > this.startMinute;
            },
            message: 'endMinute must be greater than startMinute'
        }
    },
    building: {
        type: String,
        trim: true
    },
    room: {
        type: String,
        trim: true
    }
  },
  { _id: false }
);

const sectionSchema = new Schema(
  {
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
    sectionNumber: {
        type: String,
        required: [true, 'sectionNumber is required'],
        trim: true
    },
    crn: {
        type: String,
        required: [true, 'crn is required'],
        trim: true
    },
    instructorIds: [
        { type: Schema.Types.ObjectId, ref: 'Instructor' }
    ],
    meetings: {
        type: [meetingSchema],
        default: []
    },
    modality: {
        type: String,
        enum: ['in-person', 'online', 'hybrid'],
        default: 'in-person'
    },
    capacity: {
        type: Number,
        required: [true, 'capacity is required'],
        min: 0
    },
    enrolledCount: {
        type: Number,
        default: 0,
        min: 0
    },
    waitlistCapacity: {
        type: Number,
        default: 0,
        min: 0
    },
    waitlistCount: {
        type: Number,
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ['open', 'closed', 'cancelled'],
        default: 'open'
    }
  },
  { collection: 'sections', timestamps: true, versionKey: false }
);

sectionSchema.index({ termId: 1, courseId: 1, sectionNumber: 1 }, { unique: true });
sectionSchema.index({ termId: 1, crn: 1 }, { unique: true });
sectionSchema.index({ instructorIds: 1, termId: 1 });
sectionSchema.index({ termId: 1, 'meetings.days': 1, 'meetings.startMinute': 1 });

sectionSchema.pre('validate', function () {
  if (this.enrolledCount > this.capacity) {
    this.invalidate('enrolledCount', 'enrolledCount cannot exceed capacity');
  }
  if (this.waitlistCount > this.waitlistCapacity) {
    this.invalidate('waitlistCount', 'waitlistCount cannot exceed waitlistCapacity');
  }
});

module.exports = mongoose.model('Section', sectionSchema);
module.exports.DAYS = DAYS;
