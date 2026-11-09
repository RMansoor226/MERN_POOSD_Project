const express = require('express');
const { requireAuth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validateObjectId = require('../middleware/validateObjectId');
const validate = require('../middleware/validate');
const validateQuery = require('../middleware/validateQuery');
const { section: sectionSchemas } = require('../schemas/catalogSchemas');
const sections = require('../controllers/sectionController');

const router = express.Router();

router.use(requireAuth);                 // every route below needs a valid token
router.param('id', validateObjectId);    // every :id route gets the format check

// reads: any logged-in user
router.get('/', validateQuery(sectionSchemas.query), sections.listSections);
router.get('/:id', sections.getSection);

// writes: admin only
router.post('/', requireRole('admin'), validate(sectionSchemas.create), sections.createSection);
router.patch('/:id', requireRole('admin'), validate(sectionSchemas.update), sections.updateSection);
router.delete('/:id', requireRole('admin'), sections.deleteSection);

module.exports = router;
