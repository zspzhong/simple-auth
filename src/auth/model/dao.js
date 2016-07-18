var dataUtils = require(global.frameworkLibPath + '/dao/dataUtils');
var _ = require('lodash');
var model = require('./index');

exports.newAccount = newAccount;
exports.updatePasswordByUsername = updatePasswordByUsername;
exports.checkPassword = checkPassword;
exports.accountById = accountById;
exports.accountByUsername = accountByUsername;
exports.deleteAccountById = deleteAccountById;

function newAccount(account, callback) {
    account.created_at = Date.now();
    account.updated_at = account.created_at;

    var sql = 'insert into account(id, username, password, salt, created_at, updated_at)' +
        ' values(:id, :username, :password, :salt, :created_at, :updated_at);';

    dataUtils.execSql(sql, account, callback);
}

function updatePasswordByUsername(username, password, callback) {
    var sql = 'update account' +
        ' set password = :password, updated_at = :updated_at' +
        ' where username = :username;';
    var value = {
        username: username,
        password: password,
        updated_at: Date.now()
    };

    dataUtils.execSql(sql, value, callback);
}

function checkPassword(username, password, callback) {
    var sql = 'select id from account' +
        ' where username = :username and password = :password;';

    dataUtils.execSql(sql, {username: username, password: password}, function (err, result) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, !_.isEmpty(result));
    });
}

function accountById(id, callback) {
    dataUtils.query('account', {id: id}, model.table2Fields('account'), callback);
}

function accountByUsername(username, callback) {
    dataUtils.query('account', {username: username}, model.table2Fields('account'), callback);
}

function deleteAccountById(accountId, callback) {
    var sqlList = [
        {
            sql: 'insert into account_delete select * from account where id = :id;',
            value: {id: accountId}
        },
        {
            sql: 'delete from account where id = :id;',
            value: {id: accountId}
        }
    ];

    dataUtils.seriesExecSql(sqlList, callback);
}
