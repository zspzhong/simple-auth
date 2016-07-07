var logger = require(global.frameworkLibPath + '/logger');
var innerRequest = require(global.frameworkLibPath + '/utils/innerRequest');
var cacheKey = require('../../lib/cacheKey');
var uuid = require('node-uuid');
var _ = require('lodash');
var async = require('async');
var dao = require('../model/dao');
var queryString = require('querystring');
var request = require('request');

exports.thirdPartyUserInfo = thirdPartyUserInfo;
exports.accountByOpenId = accountByOpenId;
exports.thirdPartyLogin = thirdPartyLogin;

function thirdPartyUserInfo(req, res, callback) {
    var thirdParty = _.lowerCase(req.params.thirdParty);

    switch (thirdParty) {
        case 'wechat':
            wechatUserInfo(req.query, callback);
            break;

        default:
            callback('unknown third party');
    }
}

function accountByOpenId(req, res, callback) {
    var openId = req.params.openId;

    dao.accountByOpenId(openId, function (err, result) {
        if (err) {
            callback(err);
            return;
        }

        if (_.isEmpty(result)) {
            callback(null, {});
            return;
        }

        callback(null, result[0]);
    });
}

function thirdPartyLogin(req, res, callback) {
    var thirdParty = _.lowerCase(req.params.thirdParty);

    switch (thirdParty) {
        case 'wechat':
            wechatLogin(req.body, callback);
            break;

        default:
            callback('unknown third party');
    }
}

function wechatUserInfo(options, callback) {
    var appId = options.appId;
    var secret = options.secret;
    var code = options.code;

    if (_.isEmpty(appId) || _.isEmpty(secret) || _.isEmpty(code)) {
        callback('appId, secret, code can\'t be empty');
        return;
    }

    var accessToken = '';
    var openId = '';
    var scope = '';

    var userInfo = {};

    async.series([_accessToken, _userInfo, _selfAccount], function (err) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, userInfo);
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
                callback('status code is not 200');
                return;
            }

            accessToken = result.access_token;
            openId = result.openid;
            scope = result.scope && result.scope.split(',');
            callback(null);
        });
    }

    function _userInfo(callback) {
        wechatUserInfoByOpenIdAndAccessToken(openId, accessToken, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            userInfo = result;
            callback(null);
        });
    }

    // 自己平台下的帐号
    function _selfAccount(callback) {
        // 优先使用unionid
        var unionId = userInfo.unionid || openId;
        dao.accountByOpenId(unionId, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            result = _.isEmpty(result) ? {} : result[0];

            userInfo.isBound = !_.isEmpty(result) && result.username;
            _.assign(userInfo, result);

            callback(null);
        });
    }
}

function wechatLogin(options, callback) {
    var userId = options.userId;
    var accessToken = options.accessToken;
    var expiresIn = options.expiresIn;

    var wechatUserId = '';
    var firstLogin = true;
    var loginInfo = {};

    async.series([_userInfoByAccessToken, _selfAccount, _createThirdPartyAccount, _login], function (err) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, loginInfo);
    });

    function _userInfoByAccessToken(callback) {
        wechatUserInfoByOpenIdAndAccessToken(userId, accessToken, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            if (_.isEmpty(result) || _.isEmpty(result.unionid || result.openid)) {
                callback('微信登录失败openId:' + userId + ', accessToken:' + accessToken);
                return;
            }

            wechatUserId = result.unionid || result.openid;
            callback(null);
        });
    }

    function _selfAccount(callback) {
        dao.accountByOpenId(wechatUserId, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            firstLogin = _.isEmpty(result);
            callback(null);
        });
    }

    function _createThirdPartyAccount(callback) {
        if (!firstLogin) {
            process.nextTick(callback);
            return;
        }

        var model = {
            id: uuid.v4(),
            open_id: wechatUserId,
            third_party_name: 'wechat'
        };

        dao.newAccount(model, callback);
    }

    function _login(callback) {
        var url = '/svc/auth/thirdPartyLogin';
        var data = {
            openId: wechatUserId,
            duration: expiresIn
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

function wechatUserInfoByOpenIdAndAccessToken(openId, accessToken, callback) {
    if (global.appEnv.mode === 'dev') {
        callback(null, {openid: 'admin'});
        return;
    }

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
            callback('status code is not 200');
            return;
        }

        callback(null, result);
    });
}