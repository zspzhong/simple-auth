var logger = require(global.frameworkLibPath + '/logger');
var innerRequest = require(global.frameworkLibPath + '/utils/innerRequest');
var uuid = require('node-uuid');
var _ = require('lodash');
var async = require('async');
var dao = require('../model/dao');
var queryString = require('querystring');
var request = require('request');

exports.thirdPartyByAccountId = thirdPartyByAccountId;
exports.wechatUserInfoByCode = wechatUserInfoByCode;
exports.thirdPartyByOpenId = thirdPartyByOpenId;
exports.accountByOpenId = accountByOpenId;
exports.wechatLogin = wechatLogin;
exports.thirdPartyBind = thirdPartyBind;
exports.thirdPartyUnbind = thirdPartyUnbind;

function thirdPartyByAccountId(req, res, callback) {
    var accountId = req.params.accountId;

    dao.thirdPartyByAccountId(accountId, function (err, result) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, {thirdParty: result});
    });
}

function wechatUserInfoByCode(req, res, callback) {
    var appId = req.query.appId;
    var secret = req.query.secret;
    var code = req.query.code;

    if (_.isEmpty(appId)) {
        callback('appId不能为空');
        return;
    }

    if (_.isEmpty(secret)) {
        callback('secret不能为空');
        return;
    }

    if (_.isEmpty(code)) {
        callback('code不能为空');
        return;
    }

    var isBound = false;
    var accessToken = '';
    var openId = '';
    var userInfo = {};

    async.series([_accessToken, _userInfo, _isBound], function (err) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, {userInfo: userInfo, isBound: isBound});
    });

    function _accessToken(callback) {
        var accessTokenUrl = 'https://api.weixin.qq.com/sns/oauth2/access_token?' + queryString.stringify({
                appid: appId,
                secret: secret,
                code: code,
                grant_type: 'authorization_code'
            });

        var options = {
            method: 'GET',
            uri: accessTokenUrl,
            json: true
        };

        request(options, function (err, res, result) {
            if (err) {
                callback(err);
                return;
            }

            if (res.statusCode !== 200) {
                callback('response status code is not 200');
                return;
            }

            accessToken = result.access_token;
            openId = result.openid;
            callback(null);
        });
    }

    function _userInfo(callback) {
        wechatUserInfoHelper(openId, accessToken, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            userInfo = result;
            callback(null);
        });
    }

    function _isBound(callback) {
        // 优先使用unionId
        var unionId = userInfo.unionid || openId;
        dao.accountByOpenId(unionId, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            isBound = !_.isEmpty(result);
            callback(null);
        });
    }
}

function thirdPartyByOpenId(req, res, callback) {
    var openId = req.params.openId;

    dao.thirdPartyByOpenId(openId, function (err, result) {
        if (err) {
            callback(err);
            return;
        }

        if (_.isEmpty(result)) {
            callback(null, {thirdParty: {}});
            return;
        }

        callback(null, {thirdParty: result[0]});
    });
}

function accountByOpenId(req, res, callback) {
    var openId = req.params.openId;

    dao.accountByOpenId(openId, function (err, result) {
        if (err) {
            callback(err);
            return;
        }

        result = _.isEmpty(result) ? {} : result[0];
        callback(null, {account: result});
    });
}

function wechatLogin(req, res, callback) {
    var openId = req.body.openId;
    var accessToken = req.body.accessToken;
    var duration = Number(req.body.duration) || 3600 * 24 * 30;

    if (_.isEmpty(openId)) {
        callback('openId不能为空');
        return;
    }

    if (_.isEmpty(accessToken)) {
        callback('accessToken不能为空');
        return;
    }

    var wechatUserId = '';
    var firstLogin = true;
    var existedAccount = {};
    var loginInfo = {};

    async.series([_userInfo, _existedAccount, _createThirdParty, _login], function (err) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, loginInfo);
    });

    function _userInfo(callback) {
        wechatUserInfoHelper(openId, accessToken, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            wechatUserId = result.unionid || result.openid;
            if (_.isEmpty(result) || _.isEmpty(wechatUserId)) {
                callback('微信用户信息获取失败');
                return;
            }

            callback(null);
        });
    }

    function _existedAccount(callback) {
        dao.accountByOpenId(wechatUserId, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            firstLogin = _.isEmpty(result);
            existedAccount = result;
            callback(null);
        });
    }

    function _createThirdParty(callback) {
        if (!firstLogin) {
            process.nextTick(callback);
            return;
        }

        var model = {
            id: uuid.v4(),
            open_id: wechatUserId,
            third_party_name: 'wechat'
        };

        dao.newThirdParty(model, callback);
    }

    function _login(callback) {
        var username = wechatUserId;

        // 已绑定己方帐号, 使用己方帐号登陆
        if (!_.isEmpty(existedAccount) && !_.isEmpty(existedAccount.username)) {
            username = existedAccount.username;
        }

        var url = '/svc/auth/temporary/login';
        var data = {
            username: username,
            duration: duration
        };

        innerRequest.post(url, data, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            loginInfo = result;
            callback(null);
        });
    }
}

function thirdPartyBind(req, res, callback) {
    var openId = req.body.oepnId;
    var token4OpenId = req.body.token4OpenId;
    var accountId = req.body.accountId;
    var token4AccountId = req.body.token4AccountId;

    if (_.isEmpty(openId)) {
        callback('openId不能为空');
        return;
    }

    if (_.isEmpty(accountId)) {
        callback('accountId不能为空');
        return;
    }

    if (_.isEmpty(token4OpenId)) {
        callback('token4OpenId不能为空');
        return;
    }

    if (_.isEmpty(token4AccountId)) {
        callback('token4AccountId不能为空');
        return;
    }

    var thirdPartyId = '';

    async.series([_tokenCheck, _thirdPartExists, _accountExists, _bind], callback);

    function _tokenCheck(callback) {
        async.series([_openId, _accountId], callback);

        function _openId(callback) {
            _tokenValid(token4OpenId, function (err, result) {
                if (err) {
                    callback(err);
                    return;
                }

                if (!result.isValid || openId !== result.accountId) {
                    callback('第三方登录信息无效');
                    return;
                }

                callback(null);
            });
        }

        function _accountId(callback) {
            _tokenValid(token4AccountId, function (err, result) {
                if (err) {
                    callback(err);
                    return;
                }

                if (!result.isValid || accountId !== result.accountId) {
                    callback('帐号登录信息无效');
                    return;
                }

                callback(null);
            });
        }

        function _tokenValid(token, callback) {
            var url = global.baseUrl + '/svc/token/check/' + encodeURIComponent(token);
            innerRequest.get(url, callback);
        }
    }

    function _thirdPartExists(callback) {
        dao.thirdPartyByOpenId(openId, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (_.isEmpty(result)) {
                callback('第三方信息不存在');
                return;
            }

            thirdPartyId = result[0].id;
            callback(null);
        });
    }

    function _accountExists(callback) {
        var url = global.appEnv.baseUrl + '/svc/auth/account/id/' + encodeURIComponent(accountId);

        innerRequest.get(url, callback);
    }

    function _bind(callback) {
        var thirdParty = {
            id: thirdPartyId,
            open_id: openId,
            account_id: accountId
        };

        dao.updateThirdParty(thirdParty, callback);
    }
}

function thirdPartyUnbind(req, res, callback) {
    var openId = req.body.oepnId;
    var accountId = req.body.accountId;
    var token4AccountId = req.body.token4AccountId;

    if (_.isEmpty(openId)) {
        callback('openId不能为空');
        return;
    }

    if (_.isEmpty(accountId)) {
        callback('accountId不能为空');
        return;
    }

    if (_.isEmpty(token4AccountId)) {
        callback('token4AccountId不能为空');
        return;
    }

    var thirdPartyId = '';
    async.series([_tokenCheck, _accountExists, _thirdPartExists, _unbind], callback);

    function _tokenCheck(callback) {
        var url = global.baseUrl + '/svc/token/check/' + encodeURIComponent(token4AccountId);
        innerRequest.get(url, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (!result.isValid || accountId !== result.accountId) {
                callback('帐号登录信息无效');
                return;
            }

            callback(null);
        });
    }

    function _accountExists(callback) {
        var url = global.appEnv.baseUrl + '/svc/auth/account/id/' + encodeURIComponent(accountId);

        innerRequest.get(url, callback);
    }

    function _thirdPartExists(callback) {
        dao.thirdPartyByOpenId(openId, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (_.isEmpty(result)) {
                callback('第三方信息不存在');
                return;
            }

            thirdPartyId = result[0].id;
            callback(null);
        });
    }

    function _unbind(callback) {
        var thirdParty = {
            id: thirdPartyId,
            open_id: openId,
            account_id: null
        };

        dao.updateThirdParty(thirdParty, callback);
    }
}

function wechatUserInfoHelper(openId, accessToken, callback) {
    var userInfoUrl = 'https://api.weixin.qq.com/sns/userinfo?' + queryString.stringify({
            openid: openId,
            access_token: accessToken,
            '&lang': 'zh_CN'
        });

    var options = {
        method: 'GET',
        uri: userInfoUrl,
        json: true
    };

    request(options, function (err, res, result) {
        if (err) {
            callback(err);
            return;
        }

        if (res.statusCode !== 200) {
            callback('response status code is not 200');
            return;
        }

        callback(null, result);
    });
}