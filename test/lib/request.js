// 内部通信
var request = require('request');
var _ = require('lodash');
var urlTools = require('url');
var assert = require('assert');

exports.get = get;
exports.post = post;

function get(url, options, callback) {
    if (_.isFunction(options)) {
        callback = options;
        options = {};
    }

    options = _.assign({
        method: 'GET',
        uri: fullUrl(url),
        json: true
    }, options);

    request(options, function (err, res, body) {
        if (err) {
            callback(err);
            return;
        }

        assert(res.statusCode === 200, 'status is not 200');
        callback(null, body);
    });
}

function post(url, data, options, callback) {
    if (_.isFunction(options)) {
        callback = options;
        options = {};
    }

    options = _.assign({
        method: 'POST',
        uri: fullUrl(url),
        body: data,
        json: true
    }, options);

    request(options, function (err, res, body) {
        if (err) {
            callback(err);
            return;
        }

        assert(res.statusCode === 200, 'status is not 200');
        callback(null, body);
    });
}

function fullUrl(url) {
    var urlObj = urlTools.parse(url);

    if (_.isEmpty(urlObj.host)) {
        return global.testConfig.urlPrefix + url;
    }

    return url;
}