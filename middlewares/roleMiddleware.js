// roleMiddleware.js
exports.isCitizen = (req, res, next) => {
    if (!req.session.userId) return res.redirect('/login');
    if (req.session.role === 'citizen') return next();
    res.status(403).send('Access Denied');
};

exports.isOfficer = (req, res, next) => {
    if (!req.session.userId) return res.redirect('/login');
    if (req.session.role === 'officer') return next();
    res.status(403).send('Access Denied');
};

exports.isAdmin = (req, res, next) => {
    if (!req.session.userId) return res.redirect('/login');
    if (req.session.role === 'admin') return next();
    return res.redirect('/unauthorized');
};

exports.isDepartmentHead = (req, res, next) => {
    if (!req.session.userId) return res.redirect('/login');
    if (req.session.role === 'department_head') return next();
    res.status(403).send('Access Denied');
};

exports.isOfficerOrDepartmentHead = (req, res, next) => {
    if (!req.session.userId) return res.redirect('/login');
    if (req.session.role === 'officer' || req.session.role === 'department_head') return next();
    res.status(403).send('Access Denied');
};