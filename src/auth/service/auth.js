var redis = require(global.frameworkLibPath + '/utils/redisUtils').instance();
var logger = require(global.frameworkLibPath + '/logger');
var cacheKey = require('../../lib/cacheKey');
var uuid = require('node-uuid');
var _ = require('lodash');
var async = require('async');
var dao = require('../model/authDao');

var redisExpireDuration = 3600 * 24 * 30 * 6;// redis过期时长

exports.sendCode = sendCode;
exports.register = register;
exports.login = login;
exports.logout = logout;
exports.resetPassword = resetPassword;
exports.check = check;

function sendCode(req, res, callback) {
    var reason = req.body.reason;
    var phoneNumber = req.body.phoneNumber || '';

    if (!phoneNumber) {
        callback(null, {code: 1, result: '却少必要参数'});
        return;
    }

    // todo 受信验证
    // todo 限制同一号码调用频率

    _sendCode(callback);

    function _sendCode(callback) {
        var code = _.padStart(Math.floor(Math.random() * 10000) + '', 4, '0');

        // todo send
        redis.set(cacheKey.verificationCode(phoneNumber, reason), code, 'EX', 300, callback);
    }
}

function register(req, res, callback) {
    var code = req.body.code || '';
    var username = req.body.username || '';
    var password = req.body.password;

    var doneBreak = callback;
    async.series([_verificationCode, _newUser], function (err) {
        if (err) {
            callback(err);
            return;
        }

        callback(null);
    });

    function _verificationCode(callback) {
        redis.get(cacheKey.verificationCode(username, 'register'), function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (code !== result) {
                doneBreak(null, {code: 1, result: '验证码不正确'});
                return;
            }

            callback(null);
        });
    }

    function _newUser(callback) {
        var user = {
            id: uuid.v4(),
            salt: uuid.v4(),
            username: username,
            password: password
        };

        dao.newUser(user, callback);
    }
}

function login(req, res, callback) {
    var username = req.body.username;
    var password = req.body.password;

    var deviceId = req.body.deviceId || '';
    var deviceType = req.body.deviceType || '';
    var duration = (req.body.duration || 3600 * 24 * 30) * 1000;
    var kickOut = !_.isUndefined(req.body.kickOut);

    var loginList = [];
    var token = uuid.v4();

    var doneBreak = callback;
    async.series([_verification, _existed, _update, _setToken2User], function (err) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, token);
    });

    function _verification(callback) {
        dao.checkPassword(username, password, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (result !== true) {
                doneBreak(null, {code: 1, result: '用户名密码不匹配'});
                return;
            }

            callback(null);
        });
    }

    function _existed(callback) {
        redis.get(cacheKey.loginInfo(username), function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (!_.isEmpty(result)) {
                loginList = JSON.parse(result);
            }
            callback(null);
        });
    }

    function _update(callback) {
        if (kickOut) {
            loginList = _.map(loginList, function (item) {
                if (item.deviceType === deviceType) {
                    item.kickOut = true;
                }
                return item;
            });
        }

        loginList.push({
            token: token,
            expireTime: Date.now() + duration,
            deviceType: deviceType,
            deviceId: deviceId
        });

        redis.set(cacheKey.loginInfo(username), JSON.stringify(loginList), 'EX', redisExpireDuration, callback);
    }

    function _setToken2User(callback) {
        redis.set(token, username, 'EX', redisExpireDuration, callback);
    }
}

function logout(req, res, callback) {
    var token = req.query.token || req.body.token || req.headers['token'];
    if (_.isEmpty(token)) {
        callback(null, {code: 1, result: '却少必要参数token'});
        return;
    }

    var username = req.username;
    var loginList = [];

    var doneBreak = callback;
    async.series([_existedToken, _update, _delToken2User], function (err) {
        if (err) {
            callback(err);
            return;
        }

        callback(null);
    });

    function _existedToken(callback) {
        redis.get(cacheKey.loginInfo(username), function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (_.isEmpty(result)) {
                logger.error('用户登录信息丢失', 'token', token, 'username', username);
                doneBreak(null, {code: 5, result: '服务器内部错误'});
                return;
            }

            loginList = JSON.parse(result);
            callback(null);
        });
    }

    function _update(callback) {
        loginList = _.filter(loginList, function (item) {
            return item.token !== token;
        });

        redis.set(cacheKey.loginInfo(username), JSON.stringify(loginList), 'EX', redisExpireDuration, callback);
    }

    function _delToken2User(callback) {
        redis.del(token, callback);
    }
}

function resetPassword(req, res, callback) {
    callback(null);
}

function check(req, res, callback) {
    var token = req.query.token || req.body.token || req.headers['token'];

    if (_.isEmpty(token)) {
        callback({code: 1, result: '却少必要参数token'});
        return;
    }

    var username = '';
    var tokenInfo = {};

    var doneBreak = callback;
    async.series([_username, _existedToken], function (err) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, _result());
    });

    function _username(callback) {
        redis.get(token, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            username = result;
            if (_.isEmpty(username)) {
                doneBreak(null, {code: 1, result: 'token无效'});
                return;
            }

            callback(null);
        });
    }

    function _existedToken(callback) {
        redis.get(cacheKey.loginInfo(username), function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (_.isEmpty(result)) {
                logger.error('用户登录信息丢失', 'token', token, 'username', username);
                doneBreak(null, {code: 5, result: '服务器内部错误'});
                return;
            }

            tokenInfo = _.find(JSON.parse(result), function (item) {
                return item.token === token;
            });

            callback(null);
        });
    }

    function _result() {
        if (_.isEmpty(tokenInfo)) {
            logger.error('用户登录信息丢失', 'token', token, 'username', username);
            return {code: 5, result: '服务器内部错误'};
        }

        if (tokenInfo.expireTime < Date.now()) {
            return {code: 1, result: '登录已过期'};
        }

        if (tokenInfo.kickOut) {
            return {code: 2, result: '已在其它设备登录'};
        }

        return {code: 0, result: {username: username}};
    }
}