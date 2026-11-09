const express = require('express');
const { requireAuth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validateObjectId = require('../middleware/validateObjectId');
const validate = require('../middleware/validate');
const validateQuery = require('../middleware/validateQuery');
const { course: courseSchemas } = require('../schemas/catalogSchemas');
const courses = require('../controllers/courseController');

const router = express.Router();

router.use(requireAuth);                 // every route below needs a valid token
router.param('id', validateObjectId);    // every :id route gets the format check

// reads: any logged-in user
router.get('/', validateQuery(courseSchemas.query), courses.listCourses);
router.get('/:id', courses.getCourse);

// writes: admin only
router.post('/', requireRole('admin'), validate(courseSchemas.create), courses.createCourse);
router.patch('/:id', requireRole('admin'), validate(courseSchemas.update), courses.updateCourse);
router.delete('/:id', requireRole('admin'), courses.deleteCourse);

module.exports = router;
