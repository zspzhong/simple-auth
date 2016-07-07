var dataUtils = require(global.frameworkLibPath + '/dao/dataUtils');
var _ = require('lodash');

exports.newAccount = newAccount;
exports.accountByOpenId = accountByOpenId;

function accountByOpenId(openId, callback) {
    var sql = 'select a.account_id, b.username' +
        ' from third_party_relate_account a' +
        ' left join account b on a.account_id = b.id' +
        ' where a.open_id = :openId;';

    dataUtils.execSql(sql, {openId: openId}, callback);
}

function newAccount(account, callback) {
    account.created_at = Date.now();
    account.updated_at = account.created_at;

    dataUtils.obj2DB('third_party_relate_account', account, callback);
}