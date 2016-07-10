module.exports = access;

function access() {
    return function (req, res, next) {
        // todo validate key and secret
        next(null);
    }
}