var dataUtils = require(global.frameworkLibPath + '/dao/dataUtils');
var _ = require('lodash');

exports.newUser = newUser;
exports.checkPassword = checkPassword;
exports.deleteUserByUsername = deleteUserByUsername;

function newUser(user, callback) {
    user.created_at = Date.now();
    user.updated_at = user.created_at;

    var sql = 'insert into user(id, username, password, salt, created_at, updated_at)' +
        ' values(:id, :username, md5(concat(:password, :salt)), :salt, :created_at, :updated_at);';

    dataUtils.execSql(sql, user, callback);
}

function checkPassword(username, password, callback) {
    var sql = 'select id from user' +
        ' where username = :username and password = md5(concat(:password, salt));';

    dataUtils.execSql(sql, {username: username, password: password}, function (err, result) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, !_.isEmpty(result));
    });
}

function deleteUserByUsername(username, callback) {
    var sqlList = [
        {
            sql: 'inset into user_delete select * from user where username = :username;',
            value: {username: username}
        },
        {
            sql: 'delete from user where username = :username;',
            value: {username: username}
        }
    ];

    dataUtils.seriesExecSql(sqlList, callback);
}