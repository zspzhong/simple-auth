var redis = require(global.frameworkLibPath + '/utils/redisUtils').instance();
var logger = require(global.frameworkLibPath + '/logger');
var innerRequest = require(global.frameworkLibPath + '/utils/innerRequest');
var crypto = require('crypto');
var cacheKey = require('../../lib/cacheKey');
var uuid = require('node-uuid');
var _ = require('lodash');
var async = require('async');
var dao = require('../model/dao');

exports.register = register;
exports.login = login;
exports.temporaryLogin = temporaryLogin;
exports.logout = logout;
exports.updatePassword = updatePassword;
exports.resetPassword = resetPassword;
exports.checkPassword = checkPassword;
exports.checkToken = checkToken;
exports.accountById = accountById;
exports.accountByUsername = accountByUsername;
exports.accountIdByToken = accountIdByToken;
exports.deleteAccountById = deleteAccountById;
exports.tokenInfo = tokenInfo;

function register(req, res, callback) {
    var username = req.body.username;
    var password = req.body.password;

    if (_.isEmpty(username)) {
        callback('用户名不能为空');
        return;
    }

    if (_.isEmpty(password)) {
        callback('密码不能为空');
        return;
    }

    var account = {};
    async.series([_checkDuplicate, _newAccount], function (err) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, {accountId: account.id});
    });

    function _checkDuplicate(callback) {
        dao.accountByUsername(username, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (_.isEmpty(result)) {
                callback(null);
                return;
            }

            callback('用户已注册');
        });
    }

    function _newAccount(callback) {
        account = {
            id: uuid.v4(),
            salt: uuid.v4(),
            username: username
        };

        account.password = crypto.createHash('md5').update(password + account.salt).digest('hex');
        dao.newAccount(account, callback);
    }
}

function login(req, res, callback) {
    var username = req.body.username;
    var password = req.body.password;

    if (_.isEmpty(username)) {
        callback('用户名不能为空');
        return;
    }

    if (_.isEmpty(password)) {
        callback('密码不能为空');
        return;
    }

    var loginInfo = {};

    async.series([_checkPassword, _login], function (err) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, loginInfo);
    });

    function _checkPassword(callback) {
        var options = {
            username: username,
            password: password
        };

        checkPasswordHelper(options, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (result !== true) {
                callback('用户名和密码不匹配');
                return;
            }

            callback(null);
        });
    }

    function _login(callback) {
        loginHelper(req.body, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            loginInfo = result;
            callback(null);
        });
    }
}

function temporaryLogin(req, res, callback) {
    req.body.isTemporary = true;

    if (_.isEmpty(req.body.username)) {
        callback('用户名不能为空');
        return;
    }

    loginHelper(req.body, callback);
}

function logout(req, res, callback) {
    var token = req.body.token || req.headers['x-token'];

    if (_.isEmpty(token)) {
        callback('token不能为空');
        return;
    }

    var accountId = '';
    var loginList = [];

    var doneBreak = callback;
    async.series([_accountId, _existedToken, _update, _delToken2User], function (err) {
        if (err) {
            callback(err);
            return;
        }

        callback(null);
    });

    function _accountId(callback) {
        redis.get(token, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (_.isEmpty(result)) {
                doneBreak(null);
                return;
            }

            accountId = result;
            callback(null);
        });
    }

    function _existedToken(callback) {
        redis.get(cacheKey.loginInfo(accountId), function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (_.isEmpty(result)) {
                doneBreak(null);
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

        if (_.isEmpty(loginList)) {
            redis.del(cacheKey.loginInfo(accountId), callback);
            return;
        }

        var maxExpireTime = _.max(_.map(loginList, 'expireTime')) || Date.now();
        var maxDuration = maxExpireTime - Date.now();

        redis.set(cacheKey.loginInfo(accountId), JSON.stringify(loginList), 'PX', maxDuration, callback);
    }

    function _delToken2User(callback) {
        redis.del(token, callback);
    }
}

function updatePassword(req, res, callback) {
    var username = req.body.username;
    var oldPassword = req.body.oldPassword;
    var newPassword = req.body.newPassword;

    if (_.isEmpty(username)) {
        callback('用户名不能为空');
        return;
    }

    if (_.isEmpty(oldPassword)) {
        callback('旧密码不能为空');
        return;
    }

    if (_.isEmpty(newPassword)) {
        callback('新密码不能为空');
        return;
    }

    async.series([_checkOld, _update], callback);

    function _checkOld(callback) {
        var options = {
            username: username,
            password: oldPassword
        };

        checkPasswordHelper(options, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (result !== true) {
                callback('旧密码不正确');
                return;
            }

            callback(null);
        });
    }

    function _update(callback) {
        var options = {
            username: username,
            password: newPassword
        };

        resetPasswordHelper(options, callback);
    }
}

function resetPassword(req, res, callback) {
    var username = req.body.username;
    var password = req.body.password;

    if (_.isEmpty(username)) {
        callback('用户名不能为空');
        return;
    }

    if (_.isEmpty(password)) {
        callback('密码不能为空');
        return;
    }

    resetPasswordHelper(req.body, callback);
}

function checkPassword(req, res, callback) {
    var username = req.body.username;
    var password = req.body.password;

    if (_.isEmpty(username)) {
        callback('用户名不能为空');
        return;
    }

    if (_.isEmpty(password)) {
        callback('密码不能为空');
        return;
    }

    checkPasswordHelper(req.body, function (err, result) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, {isMatch: result});
    });
}

function checkToken(req, res, callback) {
    var token = req.params.token;

    var accountId = '';
    var tokenInfo = {};

    var doneBreak = callback;
    async.series([_accountId, _existedToken], function (err) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, _result());
    });

    function _accountId(callback) {
        redis.get(token, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            accountId = result;
            if (_.isEmpty(accountId)) {
                doneBreak(null, {isValid: false});
                return;
            }

            callback(null);
        });
    }

    function _existedToken(callback) {
        redis.get(cacheKey.loginInfo(accountId), function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (_.isEmpty(result)) {
                logger.warn('用户登录信息丢失', 'token', token, 'accountId', accountId);
                doneBreak(null, {isValid: false});
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
            logger.warn('用户登录信息丢失', 'token', token, 'accountId', accountId);
            return {isValid: false};
        }

        if (tokenInfo.expireTime < Date.now()) {
            return {isValid: false};
        }

        return {isValid: true, accountId: accountId};
    }
}

function accountById(req, res, callback) {
    var id = req.params.id;

    accountByIdHelper(id, callback);
}

function accountByUsername(req, res, callback) {
    var username = req.params.username;

    dao.accountByUsername(username, function (err, result) {
        if (err) {
            callback(err);
            return;
        }

        if (_.isEmpty(result)) {
            callback('username对应的帐号信息不存在');
            return;
        }

        accountByIdHelper(result[0].id, callback);
    });
}

function accountIdByToken(req, res, callback) {
    var token = req.params.token;

    redis.get(token, function (err, result) {
        if (err) {
            callback(err);
            return;
        }

        if (_.isEmpty(result)) {
            logger.error('token对应的帐号登陆信息丢失', 'token', token);
            callback('accountId未找到');
            return;
        }

        callback(null, {accountId: result});
    });
}

function deleteAccountById(req, res, callback) {
    var accountId = req.params.accountId;

    async.series([_logoutAccount, _delete], function (err) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, {accountId: accountId});
    });

    function _logoutAccount(callback) {
        logoutAccountHelper(accountId, callback);
    }

    function _delete(callback) {
        dao.deleteAccountById(accountId, callback);
    }
}

function tokenInfo(req, res, callback) {
    var token = req.params.token;
    var accountId = '';
    var tokenInfo = {};

    async.series([_accountId, _loginInfo], function (err) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, {tokenInfo: tokenInfo});
    });

    function _accountId(callback) {
        redis.get(token, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            accountId = result;
            if (_.isEmpty(accountId)) {
                doneBreak(null, {tokenInfo: {}});
                return;
            }

            callback(null);
        });
    }

    function _loginInfo(callback) {
        redis.get(cacheKey.loginInfo(accountId), function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (_.isEmpty(result)) {
                callback(null);
                return;
            }

            result = JSON.parse(result);
            tokenInfo = _.find(result, function (item) {
                return item.token === token;
            });
            callback(null);
        });
    }

}

function checkPasswordHelper(options, callback) {
    var username = options.username;
    var password = options.password;

    dao.accountByUsername(username, function (err, result) {
        if (err) {
            callback(err);
            return;
        }

        if (_.isEmpty(result)) {
            callback('用户不存在');
            return;
        }

        password = crypto.createHash('md5').update(password + result[0].salt).digest('hex');
        dao.checkPassword(username, password, callback);
    });
}

function loginHelper(options, callback) {
    var username = options.username;
    var duration = (options.duration || 3600 * 24 * 30);
    var isTemporary = Boolean(options.isTemporary);

    var accountId = username;
    var loginList = [];
    var loginInfo = {};
    var nowMilli = Date.now();

    async.series([_account, _existed, _update, _setToken2User], function (err) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, loginInfo);
    });

    function _account(callback) {
        if (isTemporary) {
            process.nextTick(callback);
            return;
        }

        dao.accountByUsername(username, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (_.isEmpty(result)) {
                callback('用户名对应的帐号信息不存在');
                return;
            }

            accountId = result[0].id;
            callback(null);
        });
    }

    function _existed(callback) {
        redis.get(cacheKey.loginInfo(accountId), function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (!_.isEmpty(result)) {
                // 已过期的登陆信息不再继续保存
                loginList = _.filter(JSON.parse(result), function (item) {
                    return item.expireTime >= nowMilli;
                });
            }
            callback(null);
        });
    }

    function _update(callback) {
        loginInfo = {
            accountId: accountId,
            token: uuid.v4(),
            expireTime: nowMilli + duration * 1000,
            isTemporary: isTemporary
        };

        loginList.push(loginInfo);

        var maxExpireTime = _.max(_.map(loginList, 'expireTime'));
        var maxDuration = maxExpireTime - nowMilli;

        redis.set(cacheKey.loginInfo(accountId), JSON.stringify(loginList), 'PX', maxDuration, callback);
    }

    function _setToken2User(callback) {
        redis.set(loginInfo.token, accountId, 'EX', duration, callback);
    }
}

function resetPasswordHelper(options, callback) {
    var username = options.username;
    var password = options.password;

    var account = {};
    async.series([_accountId, _update, _logoutAccount], callback);

    function _accountId(callback) {
        dao.accountByUsername(username, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (_.isEmpty(result)) {
                callback('用户名对应的帐号信息不存在');
                return;
            }

            account = result[0];
            callback(null);
        });
    }

    function _update(callback) {
        password = crypto.createHash('md5').update(password + account.salt).digest('hex');

        dao.updatePasswordByUsername(username, password, callback);
    }

    function _logoutAccount(callback) {
        logoutAccountHelper(account.id, callback);
    }
}

function accountByIdHelper(id, callback) {
    var account = {};

    async.series([_account, _thirdParty], function (err) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, account);
    });

    function _account(callback) {
        dao.accountById(id, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (_.isEmpty(result)) {
                callback('id对应的帐号信息不存在');
                return;
            }

            account = result[0];
            callback(null);
        });
    }

    function _thirdParty(callback) {
        var url = global.appEnv.baseUrl + '/svc/auth/thirdParty/accountId/' + encodeURIComponent(id);

        innerRequest.get(url, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            account.relatedThirdParty = result.thirdParty;
            callback(null);
        });
    }
}

function logoutAccountHelper(accountId, callback) {
    var loginList = [];

    async.series([_loginList, _delete], callback);

    function _loginList(callback) {
        redis.get(cacheKey.loginInfo(accountId), function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            loginList = result;
            callback(null);
        });
    }

    function _delete(callback) {
        var pipeline = redis.pipeline();
        pipeline.del(cacheKey.loginInfo(accountId));

        _.each(loginList, function (item) {
            pipeline.del(item.token);
        });

        pipeline.exec(callback);
    }
}