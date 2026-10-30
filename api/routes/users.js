const express = require('express');
const { User } = require('../../models');

const router = express.Router();

// GET /api/users
router.get('/', async (req, res) => {
    res.status(501).json({error: 'Not Implemented'});
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
    res.status(501).json({error: 'Not Implemented'});
});

// POST /api/users
router.post('/', async (req, res) => {
    res.status(501).json({error: 'Not Implemented'});
});

// PATCH /api/users/:id
router.patch('/:id', async (req, res) => {
    res.status(501).json({error: 'Not Implemented'});
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
    res.status(501).json({error: 'Not Implemented'});
});

module.exports = router;