const express = require('express');
const { requireAuth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validateObjectId = require('../middleware/validateObjectId');
const validate = require('../middleware/validate');
const validateQuery = require('../middleware/validateQuery');
const { term: termSchemas } = require('../schemas/catalogSchemas');
const terms = require('../controllers/termController');

const router = express.Router();

router.use(requireAuth);                 // every route below needs a valid token
router.param('id', validateObjectId);    // every :id route gets the format check

// reads: any logged-in user
router.get('/', validateQuery(termSchemas.query), terms.listTerms);
router.get('/:id', terms.getTerm);

// writes: admin only
router.post('/', requireRole('admin'), validate(termSchemas.create), terms.createTerm);
router.patch('/:id', requireRole('admin'), validate(termSchemas.update), terms.updateTerm);
router.delete('/:id', requireRole('admin'), terms.deleteTerm);

module.exports = router;
