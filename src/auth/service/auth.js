var redis = require(global.frameworkLibPath + '/utils/redisUtils').instance();
var logger = require(global.frameworkLibPath + '/logger');
var cacheKey = require('../../lib/cacheKey');
var uuid = require('node-uuid');
var _ = require('lodash');
var async = require('async');
var dao = require('../model/dao');

var redisExpireDuration = 3600 * 24 * 30 * 6;// redis过期时长

exports.register = register;
exports.login = loginByPassword;
exports.thirdPartyLogin = thirdPartyLogin;
exports.logout = logout;
exports.updatePassword = updatePassword;
exports.checkToken = checkToken;
exports.checkPassword = checkPassword;

function register(req, res, callback) {
    var username = req.body.username;
    var password = req.body.password;

    if (_.isEmpty(username) || _.isEmpty(password)) {
        callback(null, {code: 1, result: '用户名与密码不能为空'});
        return;
    }

    async.series([_checkDuplicate, _newAccount], function (err) {
        if (err) {
            callback(err);
            return;
        }

        callback(null);
    });

    function _checkDuplicate(callback) {
        // todo 重复注册检查
        process.nextTick(callback);
    }

    function _newAccount(callback) {
        var user = {
            id: uuid.v4(),
            salt: uuid.v4(),
            username: username,
            password: password
        };

        dao.newAccount(user, callback);
    }
}

function loginByPassword(req, res, callback) {
    var username = req.body.username;
    var password = req.body.password;

    if (_.isEmpty(username) || _.isEmpty(password)) {
        callback(null, {code: 1, result: '用户名与密码不能为空'});
        return;
    }

    var loginInfo = {};

    var doneBreak = callback;
    async.series([_checkPassword, _login], function (err) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, loginInfo);
    });

    function _checkPassword(callback) {
        dao.checkPassword(username, password, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (result !== true) {
                doneBreak(null, {code: 1, result: '用户名和密码不匹配'});
                return;
            }

            callback(null);
        });
    }

    function _login(callback) {
        login(req.body, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            loginInfo = result;
            callback(null);
        });
    }
}

function thirdPartyLogin(req, res, callback) {
    req.body.username = req.body.openId;
    req.body.isThirdParty = true;

    if (_.isEmpty(req.body.openId)) {
        callback(null, {code: 1, result: '第三方帐号Id不能为空'});
        return;
    }

    login(req.body, callback);
}

function logout(req, res, callback) {
    var token = req.body.token || req.headers['x-token'];
    var username = req.body.username;

    if (_.isEmpty(token)) {
        callback(null, {code: 1, result: '却少必要参数token'});
        return;
    }

    if (_.isEmpty(username)) {
        callback(null, {code: 1, result: '用户名不能为空'});
        return;
    }

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

function updatePassword(req, res, callback) {
    var username = req.body.username;
    var password = req.body.password;

    if (_.isEmpty(username) || _.isEmpty(password)) {
        callback(null, {code: 1, result: '用户名与密码不能为空'});
        return;
    }

    // todo kickOut all login account

    dao.updatePassword(username, password, uuid.v4(), callback);
}

function checkToken(req, res, callback) {
    var token = req.query.token || req.body.token || req.headers['x-token'];

    if (_.isEmpty(token)) {
        callback(null, {code: 1, result: '却少必要参数token'});
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

function checkPassword(req, res, callback) {
    var username = req.body.username;
    var password = req.body.password;

    if (_.isEmpty(username) || _.isEmpty(password)) {
        callback(null, {code: 1, result: '用户名与密码不能为空'});
        return;
    }

    dao.checkPassword(username, password, function (err, result) {
        if (err) {
            callback(err);
            return;
        }

        if (result !== true) {
            callback(null, {code: 1, result: '用户名和密码不匹配'});
            return;
        }

        callback(null);
    });
}

function login(options, callback) {
    var username = options.username;
    var deviceId = options.deviceId || '';
    var deviceType = options.deviceType || '';
    var duration = (options.duration || 3600 * 24 * 30) * 1000;
    var kickOut = !_.isUndefined(options.kickOut);
    var isThirdParty = !_.isUndefined(options.isThirdParty);

    var maxExpire = _.max([duration / 1000, redisExpireDuration]);
    var loginList = [];
    var loginInfo = {};

    async.series([_existed, _update, _setToken2User], function (err) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, loginInfo);
    });

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

        loginInfo = {
            token: uuid.v4(),
            expireTime: Date.now() + duration,
            deviceType: deviceType,
            deviceId: deviceId,
            isThirdParty: isThirdParty
        };
        loginList.push(loginInfo);

        redis.set(cacheKey.loginInfo(username), JSON.stringify(loginList), 'EX', maxExpire, callback);
    }

    function _setToken2User(callback) {
        redis.set(loginInfo.token, username, 'EX', maxExpire, callback);
    }
}