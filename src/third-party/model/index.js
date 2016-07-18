var _ = require('lodash');
var TYPE = require('sequelize');
var sequelizeWrap = require('../../lib/sequelizeWrap');

var table2Schema = {
    third_party_relate_account: {
        id: {type: TYPE.STRING(64), primaryKey: true},
        open_id: {type: TYPE.STRING(64), allowNull: false, unique: true},
        account_id: {type: TYPE.STRING(64), unique: true},
        third_party_name: {type: TYPE.STRING(64)},
        created_at: {type: TYPE.FLOAT, allowNull: false},
        updated_at: {type: TYPE.FLOAT, allowNull: false}
    },
    third_party_relate_account_delete: {
        id: {type: TYPE.STRING(64), primaryKey: true},
        open_id: {type: TYPE.STRING(64), allowNull: false},
        account_id: {type: TYPE.STRING(64), unique: true},
        third_party_name: {type: TYPE.STRING(64)},
        created_at: {type: TYPE.FLOAT, allowNull: false},
        updated_at: {type: TYPE.FLOAT, allowNull: false}
    }
};

exports.table2Fields = table2Fields;

sequelizeWrap.define('third_party_relate_account', table2Schema.third_party_relate_account, {indexes: [{fields: ['account_id']}, {fields: ['open_id']}]});

sequelizeWrap.define('third_party_relate_account_delete', table2Schema.third_party_relate_account_delete, {indexes: [{fields: ['account_id']}, {fields: ['open_id']}]});

function table2Fields(table) {
    return _.keys(table2Schema[table]);
}