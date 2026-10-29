const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    ProfessorName: {
        type: String,
        trim: true
    },
    ClassCode: {
        type: String,
        default: '',
        trim: true
    },
    Prereq: {
        type: [{ type: String }],
        default: ''
    },
    Size: {
        type: Number,
        default: 0,
        required: [true, 'class size required']
    },
    Count: {
        type: Number,
        default: 0
    },
    userId: {
        type: String,
        required: [true, 'userId is required'],
        trim: true
    }
  },
  {
    collection: 'cards',
    versionKey: false
  }
);

module.exports = mongoose.model('Class', classSchema);
