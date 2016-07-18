var request = require('./lib/request');
var assert = require('assert');
var _ = require('lodash');

describe('auth', function () {
    describe('/register post', function () {
        it('normal', function (done) {
            request.post('/register', _.pick(testConfig.mockData, ['username', 'password']), function (err, body) {
                if (err) {
                    done(err);
                    return;
                }

                assert(body.code === 0, 'code is not 0');
                assert(!_.isEmpty(body.result.accountId), 'accountId is empty');
                testConfig.mockData.id = body.result.accountId;
                done(null);
            });
        });
    });

    describe('/login post', function () {
        it('normal', function (done) {
            request.post('/login', _.pick(testConfig.mockData, ['username', 'password']), function (err, body) {
                if (err) {
                    done(err);
                    return;
                }

                assert(body.code === 0, 'code is not 0');
                assert(!_.isEmpty(body.result.accountId), 'accountId is empty');
                assert(!_.isEmpty(body.result.token), 'token is empty');
                assert(_.isNumber(body.result.expireTime), 'expireTime is not number');
                testConfig.mockData.token = body.result.token;
                done(null);
            });
        });
    });

    describe('/temporary/login', function () {
        var temporaryToken = '';

        it('normal', function (done) {
            request.post('/temporary/login', _.pick(testConfig.mockData, ['username']), function (err, body) {
                if (err) {
                    done(err);
                    return;
                }

                assert(body.code === 0, 'code is not 0');
                assert(!_.isEmpty(body.result.accountId), 'accountId is empty');
                assert(!_.isEmpty(body.result.token), 'token is empty');
                assert(_.isNumber(body.result.expireTime), 'expireTime is not number');
                assert(body.result.isTemporary, 'isTemporary is false');
                temporaryToken = body.result.token;
                done(null);
            });
        });

        it('temporary token logout', function (done) {
            request.post('/logout', {token: temporaryToken}, function (err, body) {
                if (err) {
                    done(err);
                    return;
                }

                assert(body.code === 0, 'code is not 0');
                done(null);
            });
        });
    });

    describe('/token/check/:token', function () {
        it('normal', function (done) {
            request.get('/token/check/' + testConfig.mockData.token, function (err, body) {
                if (err) {
                    done(err);
                    return;
                }

                assert(body.code === 0, 'code is not 0');
                assert(body.result.isValid, 'token invalid');
                assert(!_.isEmpty(body.result.accountId), 'accountId is empty');
                done(null);
            });
        });

        it('token invalid', function (done) {
            request.get('/token/check/' + _.random(100000, 999999), function (err, body) {
                if (err) {
                    done(err);
                    return;
                }

                assert(body.code === 0, 'code is not 0');
                assert(!body.result.isValid, 'token valid');
                assert(_.isEmpty(body.result.accountId), 'accountId not empty');
                done(null);
            });
        });
    });

    describe('/token/:token', function () {
        it('normal', function (done) {
            request.get('/token/' + testConfig.mockData.token, function (err, body) {
                if (err) {
                    done(err);
                    return;
                }

                assert(body.code === 0, 'code is not 0');
                assert(!_.isEmpty(body.result.tokenInfo), 'token info is empty');
                done(null);
            });
        });
    });

    describe('/logout', function () {
        it('normal', function (done) {
            request.post('/logout', _.pick(testConfig.mockData, ['token']), function (err, body) {
                if (err) {
                    done(err);
                    return;
                }

                assert(body.code === 0, 'code is not 0');
                done(null);
            });
        });
    });

    describe('/password/update', function () {
        it('normal', function (done) {
            var data = {
                username: testConfig.mockData.username,
                oldPassword: testConfig.mockData.password,
                newPassword: '666666'
            };

            request.post('/password/update', data, function (err, body) {
                if (err) {
                    done(err);
                    return;
                }

                assert(body.code === 0, 'code is not 0');
                done(null);
            });
        });

        it('when old password incorrect', function (done) {
            var data = {
                username: testConfig.mockData.username,
                oldPassword: testConfig.mockData.password,
                newPassword: '666666'
            };

            request.post('/password/update', data, function (err, body) {
                if (err) {
                    done(err);
                    return;
                }

                assert(body.code === 1, 'code is 0');
                done(null);
            });
        });
    });

    describe('/password/reset', function () {
        it('normal', function (done) {
            var data = {
                username: testConfig.mockData.username,
                password: testConfig.mockData.password
            };

            request.post('/password/reset', data, function (err, body) {
                if (err) {
                    done(err);
                    return;
                }

                assert(body.code === 0, 'code is not 0');
                done(null);
            });
        });
    });

    describe('/password/check', function () {
        it('normal', function (done) {
            var data = {
                username: testConfig.mockData.username,
                password: testConfig.mockData.password
            };

            request.post('/password/check', data, function (err, body) {
                if (err) {
                    done(err);
                    return;
                }

                assert(body.code === 0, 'code is not 0');
                assert(body.result.isMatch, 'not match');
                done(null);
            });
        });

        it('not match state', function (done) {
            var data = {
                username: testConfig.mockData.username,
                password: _.random(100000, 999999) + ''
            };

            request.post('/password/check', data, function (err, body) {
                if (err) {
                    done(err);
                    return;
                }

                assert(body.code === 0, 'code is not 0');
                assert(!body.result.isMatch, 'match');
                done(null);
            });
        });
    });


    describe('/account/id/:id', function () {
        it('normal', function (done) {
            request.get('/account/id/' + testConfig.mockData.id, function (err, body) {
                if (err) {
                    done(err);
                    return;
                }

                assert(body.code === 0, 'code is not 0');
                assert(!_.isEmpty(body.result.id), 'id is empty');
                assert(!_.isEmpty(body.result.username), 'username is empty');
                done(null);
            });
        });
    });

    describe('/account/username/:username', function () {
        it('normal', function (done) {
            request.get('/account/username/' + testConfig.mockData.username, function (err, body) {
                if (err) {
                    done(err);
                    return;
                }

                assert(body.code === 0, 'code is not 0');
                assert(!_.isEmpty(body.result.id), 'id is empty');
                assert(!_.isEmpty(body.result.username), 'username is empty');
                done(null);
            });
        });
    });

    describe('/account/delete/:accountId', function () {
        it('nomal', function (done) {
            request.post('/account/delete/' + testConfig.mockData.id, {}, function (err, body) {
                if (err) {
                    done(err);
                    return;
                }

                assert(body.code === 0, 'code is not 0');
                assert(!_.isEmpty(body.result.accountId, 'accountId is empty'));
                done(null);
            });
        });
    });
});

