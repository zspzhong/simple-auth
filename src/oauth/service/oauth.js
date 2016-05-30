var innerRequest = require(global.frameworkLibPath + '/utils/innerRequest');
var logger = require(global.frameworkLibPath + '/logger');
var cacheKey = require('../../lib/cacheKey');
var uuid = require('node-uuid');
var _ = require('lodash');
var async = require('async');
var dao = require('../model/dao');
var queryString = require('querystring');
var request = require('request');

exports.userInfo = userInfo;
exports.accountByOpenId = accountByOpenId;

function userInfo(req, res, callback) {
    var thirdParty = _.lowerCase(req.params.thirdParty); // wechat

    switch (thirdParty) {
        case 'wechat':
            _wechatCallback();
            break;

        default:
            callback('unknown third party');
    }

    function _wechatCallback() {
        var appId = req.query.appId;
        var secret = req.query.secret;
        var code = req.query.code;

        // todo args check

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
            var userInfoUrl = 'https://api.weixin.qq.com/sns/userinfo?' + queryString.stringify({
                    access_token: accessToken,
                    openid: openId,
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

                userInfo = result;
                callback(null);
            });
        }

        // 自己平台下的帐号
        function _selfAccount(callback) {
            var url = '/svc/auth/accountByOpenId/' + openId;
            innerRequest.get(url, function (err, result) {
                if (err) {
                    callback(err);
                    return;
                }

                _.assign(userInfo, result);
                userInfo.isBound = !_.isEmpty(result);

                callback(null);
            });
        }
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