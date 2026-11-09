const express = require('express');
const { requireAuth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validateObjectId = require('../middleware/validateObjectId');
const validate = require('../middleware/validate');
const validateQuery = require('../middleware/validateQuery');
const { instructor: instructorSchemas } = require('../schemas/catalogSchemas');
const instructors = require('../controllers/instructorController');

const router = express.Router();

router.use(requireAuth);                 // every route below needs a valid token
router.param('id', validateObjectId);    // every :id route gets the format check

// reads: any logged-in user
router.get('/', validateQuery(instructorSchemas.query), instructors.listInstructors);
router.get('/:id', instructors.getInstructor);

// writes: admin only
router.post('/', requireRole('admin'), validate(instructorSchemas.create), instructors.createInstructor);
router.patch('/:id', requireRole('admin'), validate(instructorSchemas.update), instructors.updateInstructor);
router.delete('/:id', requireRole('admin'), instructors.deleteInstructor);

module.exports = router;
