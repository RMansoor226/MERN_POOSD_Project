const mongoose = require('mongoose');
const { Schema } = mongoose;

const termSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Term name is required'],
      unique: true,
      trim: true // e.g. "Fall 2026"
    },
    year: {
        type: Number,
        required: [true, 'year is required']
    },
    season: {
      type: String,
      required: [true, 'season is required'],
      enum: ['spring', 'summer', 'fall']
    },
    startDate: {
        type: Date,
        required: [true, 'startDate is required']
    },
    endDate: {
        type: Date,
        required: [true, 'endDate is required']
    },
    registrationOpens: {
        type: Date,
        required: [true, 'registrationOpens is required'] },
    registrationCloses: { type: Date, required: [true, 'registrationCloses is required'] }
  },
  { collection: 'terms', timestamps: true, versionKey: false }
);

termSchema.index({ year: 1, season: 1 });

termSchema.pre('validate', function () {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    this.invalidate('endDate', 'endDate must be after startDate');
  }
  if (
    this.registrationOpens &&
    this.registrationCloses &&
    this.registrationCloses <= this.registrationOpens
  ) {
    this.invalidate('registrationCloses', 'registrationCloses must be after registrationOpens');
  }
});

module.exports = mongoose.model('Term', termSchema);
