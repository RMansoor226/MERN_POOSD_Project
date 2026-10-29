const mongoose = require('mongoose');
const { Schema } = mongoose;

const instructorSchema = new Schema(
  {
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }, // optional login account
    firstName: {
        type: String,
        required: [true, 'firstName is required'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'lastName is required'],
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    title: {
        type: String,
        trim: true
    }, // "Associate Professor"
    departmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Department'
    }
  },
  { collection: 'instructors', timestamps: true, versionKey: false }
);

instructorSchema.index({ lastName: 1, firstName: 1 });
instructorSchema.index({ userId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Instructor', instructorSchema);
