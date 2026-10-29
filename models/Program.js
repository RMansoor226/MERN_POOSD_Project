const mongoose = require('mongoose');
const { Schema } = mongoose;

const requirementSchema = new Schema({
  name: {
        type: String,
        required: [true, 'requirement name is required'],
        trim: true
  }, // "Core"
  rule: {
        type: String,
        required: [true, 'rule is required'],
        enum: ['all', 'anyN', 'minCredits']
  },
  n: {
        type: Number,
        min: 1
  }, // required when rule === 'anyN'
  credits: {
        type: Number,
        min: 1
  }, // required when rule === 'minCredits'
  courseIds: [
        { type: Schema.Types.ObjectId, ref: 'Course' }
  ], // explicit options
  filter: {
        subject: {
            type: String,
            uppercase: true,
            trim: true
        }, // "COP"
        minLevel: Number, // 4000 = any 4000-level or above
        attribute: {
            type: String,
            trim: true
        } // "Writing Intensive"
  }
});

requirementSchema.pre('validate', function () {
  if (this.rule === 'anyN' && !this.n) {
    this.invalidate('n', 'n is required when rule is anyN');
  }
  if (this.rule === 'minCredits' && !this.credits) {
    this.invalidate('credits', 'credits is required when rule is minCredits');
  }
});

const programSchema = new Schema(
  {
    name: {
        type: String,
        required: [true, 'name is required'],
        trim: true
    },
    type: {
        type: String,
        required: [true, 'type is required'],
        enum: ['major', 'minor', 'certificate']
    },
    degree: {
        type: String,
        trim: true
    }, // "BS"
    departmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Department',
        index: true
    },
    catalogYear: {
        type: Number,
        required: [true, 'catalogYear is required']
    },
    totalCredits: {
        type: Number,
        min: 0
    },
    requirements: {
        type: [requirementSchema],
        default: []
    }
  },
  { collection: 'programs', timestamps: true, versionKey: false }
);

programSchema.index({ type: 1, name: 1, catalogYear: 1 }, { unique: true });

module.exports = mongoose.model('Program', programSchema);
