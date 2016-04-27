var redis = require(global.frameworkLibPath + '/utils/redisUtils').instance();
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

function sendCode(req, res, callback) {
    var reason = req.body.reason;
    var phoneNumber = req.body.phoneNumber || '';

    if (!phoneNumber) {
        callback('却少必要参数');
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
    var phoneNumber = req.body.phoneNumber || '';
    var username = req.body.username || phoneNumber || '';
    var password = req.body.password;

    var codeMatch = false;

    async.series([_verificationCode, _newUser], function (err) {
        if (err) {
            callback(err);
            return;
        }

        if (!codeMatch) {
            callback(null, {code: 1, result: '验证码不正确'});
            return;
        }

        callback(null);
    });

    function _verificationCode(callback) {
        redis.get(cacheKey.verificationCode(phoneNumber, 'register'), function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (code === result) {
                codeMatch = true;
            }

            callback(null);
        });
    }

    function _newUser(callback) {
        if (!codeMatch) {
            process.nextTick(callback);
            return;
        }

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
    var kick = !_.isUndefined(req.body.kick);
    var duration = req.body.duration || 3600 * 24 * 10;

    var match = false;
    var loginInfo = [];
    var token = uuid.v4();

    async.series([_verification, _existed, _update, _token2User], function (err) {
        if (err) {
            callback(err);
            return;
        }

        if (!match) {
            callback(null, {code: 1, result: '用户名密码不匹配'});
            return;
        }

        callback(null, token);
    });

    function _verification(callback) {
        dao.verificationUser(username, password, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            match = (result === true);
            callback(null);
        });
    }

    function _existed(callback) {
        if (!match) {
            process.nextTick(callback);
            return;
        }

        redis.get(cacheKey.loginInfo(username), function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (!_.isEmpty(result)) {
                loginInfo = JSON.parse(result);
            }
            callback(null);
        });
    }

    function _update(callback) {
        if (!match) {
            process.nextTick(callback);
            return;
        }

        if (kick) {
            loginInfo = _.map(loginInfo, function (item) {
                if (item.deviceType === deviceType) {
                    item.kickout = true;
                }
                return item;
            });
        }

        loginInfo.push({
            token: token,
            expireTime: Date.now() + duration,
            deviceType: deviceType,
            deviceId: deviceId
        });

        redis.set(cacheKey.loginInfo(username), JSON.stringify(loginInfo), 'EX', redisExpireDuration, callback);
    }

    function _token2User(callback) {
        if (!match) {
            process.nextTick(callback);
            return;
        }

        redis.set(token, username, 'EX', redisExpireDuration, callback);
    }
}

function logout(req, res, callback) {
    var token = req.body.token;
    var username = '';
    var loginInfo = [];

    async.series([_username, _existed, _update, _delToken2User], function (err) {
        if (err) {
            callback(err);
            return;
        }

        callback(null);
    });

    function _username(callback) {
        redis.get(token, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            username = result;
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
                loginInfo = JSON.parse(result);
            }

            callback(null);
        });
    }

    function _update(callback) {
        loginInfo = _.filter(loginInfo, function (item) {
            return item.token !== token;
        });

        redis.set(cacheKey.loginInfo(username), JSON.stringify(loginInfo), 'EX', redisExpireDuration, callback);
    }

    function _delToken2User(callback) {
        redis.del(token, callback);
    }
}

function resetPassword(req, res, callback) {
    callback(null);
}