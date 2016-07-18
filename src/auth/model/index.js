var _ = require('lodash');
var TYPE = require('sequelize');
var sequelizeWrap = require('../../lib/sequelizeWrap');

var table2Schema = {
    account: {
        id: {type: TYPE.STRING(64), primaryKey: true},
        username: {type: TYPE.STRING(64), allowNull: false, unique: true},
        password: {type: TYPE.STRING(64), allowNull: false},
        salt: {type: TYPE.STRING(64), allowNull: false},
        created_at: {type: TYPE.FLOAT, allowNull: false},
        updated_at: {type: TYPE.FLOAT, allowNull: false}
    },
    account_delete: {
        id: {type: TYPE.STRING(64), primaryKey: true},
        username: {type: TYPE.STRING(64), allowNull: false},
        password: {type: TYPE.STRING(64), allowNull: false},
        salt: {type: TYPE.STRING(64), allowNull: false},
        created_at: {type: TYPE.FLOAT, allowNull: false},
        updated_at: {type: TYPE.FLOAT, allowNull: false}
    }
};

exports.table2Fields = table2Fields;

sequelizeWrap.define('account', table2Schema.account, {indexes: [{fields: ['username']}]});

sequelizeWrap.define('account_delete', table2Schema.account_delete);


function table2Fields(table) {
    return _.keys(table2Schema[table]);
}