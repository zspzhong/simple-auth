var dataUtils = require(global.frameworkLibPath + '/dao/dataUtils');
var _ = require('lodash');

exports.accountByOpenId = accountByOpenId;

function accountByOpenId(openId, callback) {
    var sql = 'select account_id from third_party_relate_user' +
        ' where open_id = :openId;';

    dataUtils.execSql(sql, {openId: openId}, callback);
}