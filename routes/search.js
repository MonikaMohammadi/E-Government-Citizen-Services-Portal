const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/authMiddleware');
const searchController = require('../controllers/searchController');

function canSearch(req, res, next) {
    if(req.session.role === 'officer' || req.session.role === 'admin') {
        return next();
    }
    return res.status(403).send('Forbidden');
}

router.use(isAuthenticated);
router.use(canSearch);

router.get('/', searchController.searchPage);
router.post('/', searchController.searchRequests);

module.exports = router;
