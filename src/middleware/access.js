module.exports = access;

function access(req, res, next) {
    // todo validate key and secret
    next(null);
}