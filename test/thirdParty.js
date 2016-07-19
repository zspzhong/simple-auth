var request = require('./lib/request');
var assert = require('assert');
var _ = require('lodash');

describe('thirdParty', function () {
    before(function (callback) {
        request.post('/register', _.pick(testConfig.mockData, ['username', 'password']), function (err, body) {
            if (err) {
                callback(err);
                return;
            }

            assert(body.code === 0, 'code is not 0');
            assert(!_.isEmpty(body.result.accountId), 'accountId is empty');
            testConfig.mockData.accountId = body.result.accountId;
            callback(null);
        });
    });

    after(function (callback) {
        if (_.isEmpty(testConfig.mockData.accountId)) {
            callback(null);
            return;
        }

        request.post('/account/delete', {accountId: testConfig.mockData.accountId}, function (err, body) {
            if (err) {
                callback(err);
                return;
            }

            assert(body.code === 0, 'code is not 0');
            assert(!_.isEmpty(body.result.accountId, 'accountId is empty'));
            callback(null);
        });
    });

    describe('/thirdParty/accountId/:accountId', function () {
        it('third party not exists', function (done) {
            request.get('/thirdParty/accountId/' + testConfig.mockData.accountId, function (err, body) {
                if (err) {
                    done(err);
                    return;
                }

                assert(body.code === 0, 'code is not 0');
                assert(_.isEmpty(body.result.thirdParty), 'third party is not empty');
                done(null);
            });
        });
    });

    describe('/thirdParty/openId/:openId', function () {
        it('normal', function (done) {
            request.get('/thirdParty/openId/' + testConfig.mockData.openId, function (err, body) {
                if (err) {
                    done(err);
                    return;
                }

                assert(body.code === 0, 'code is not 0');
                assert(_.isEmpty(body.result.thirdParty), 'third party is not empty');
                done(null);
            });
        });
    });

    describe('/thirdParty/account/openId/:openId', function () {
        it('normal', function (done) {
            request.get('/thirdParty/account/openId/' + testConfig.mockData.openId, function (err, body) {
                if (err) {
                    done(err);
                    return;
                }

                assert(body.code === 0, 'code is not 0');
                assert(_.isEmpty(body.result.account), 'account is not empty');
                done(null);
            });
        });
    });
});