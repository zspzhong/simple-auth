var dataUtils = require(global.frameworkLibPath + '/dao/dataUtils');
var _ = require('lodash');
var model = require('./index');

exports.thirdPartyByAccountId = thirdPartyByAccountId;
exports.thirdPartyByOpenId = thirdPartyByOpenId;
exports.accountByOpenId = accountByOpenId;
exports.newThirdParty = newThirdParty;
exports.updateThirdParty = updateThirdParty;

function thirdPartyByAccountId(accountId, callback) {
    dataUtils.query('third_party_relate_account', {account_id: accountId}, model.table2Fields('third_party_relate_account'), callback);
}

function thirdPartyByOpenId(openId, callback) {
    dataUtils.query('third_party_relate_account', {open_id: openId}, model.table2Fields('third_party_relate_account'), callback);
}

function accountByOpenId(openId, callback) {
    var sql = 'select b.*' +
        ' from third_party_relate_account a, account b' +
        ' where a.open_id = :openId and a.account_id = b.id';

    dataUtils.execSql(sql, {openId: openId}, callback);
}

function newThirdParty(thirdParty, callback) {
    thirdParty.created_at = Date.now();
    thirdParty.updated_at = thirdParty.created_at;

    var fields = model.table2Fields('third_party_relate_account');
    dataUtils.obj2DB('third_party_relate_account', thirdParty, fields, callback);
}

function updateThirdParty(thirdParty, callback) {
    delete thirdParty.created_at;
    thirdParty.updated_at = Date.now();

    var fields = model.table2Fields('third_party_relate_account');
    dataUtils.updateObj2DB('third_party_relate_account', thirdParty, fields, ['id'], callback);
}
