var dataUtils = require(global.frameworkLibPath + '/dao/dataUtils');
var _ = require('lodash');

exports.newAccount = newAccount;
exports.checkPassword = checkPassword;
exports.deleteAccountByUsername = deleteAccountByUsername;

function newAccount(user, callback) {
    user.created_at = Date.now();
    user.updated_at = user.created_at;

    var sql = 'insert into account(id, username, password, salt, created_at, updated_at)' +
        ' values(:id, :username, md5(concat(:password, :salt)), :salt, :created_at, :updated_at);';

    dataUtils.execSql(sql, user, callback);
}

function checkPassword(username, password, callback) {
    var sql = 'select id from account' +
        ' where username = :username and password = md5(concat(:password, salt));';

    dataUtils.execSql(sql, {username: username, password: password}, function (err, result) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, !_.isEmpty(result));
    });
}

function deleteAccountByUsername(username, callback) {
    var sqlList = [
        {
            sql: 'inset into account_delete select * from user where username = :username;',
            value: {username: username}
        },
        {
            sql: 'delete from account where username = :username;',
            value: {username: username}
        }
    ];

    dataUtils.seriesExecSql(sqlList, callback);
}