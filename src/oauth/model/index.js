var TYPE = require('sequelize');
var sequelizeWrap = require('../../lib/sequelizeWrap');

sequelizeWrap.define('third_party_relate_user', {
    id: {type: TYPE.STRING(64), primaryKey: true},
    open_id: {type: TYPE.STRING(64), allowNull: false, unique: true},
    account_id: {type: TYPE.STRING(64), allowNull: false, unique: true},
    third_party_name: {type: TYPE.STRING(64)},
    created_at: {type: TYPE.FLOAT, allowNull: false},
    updated_at: {type: TYPE.FLOAT, allowNull: false}
}, {indexes: [{fields: ['account_id']}, {fields: ['open_id']}]});

sequelizeWrap.define('third_party_relate_user_delete', {
    id: {type: TYPE.STRING(64), primaryKey: true},
    open_id: {type: TYPE.STRING(64), allowNull: false, unique: true},
    account_id: {type: TYPE.STRING(64), allowNull: false, unique: true},
    third_party_name: {type: TYPE.STRING(64)},
    created_at: {type: TYPE.FLOAT, allowNull: false},
    updated_at: {type: TYPE.FLOAT, allowNull: false}
}, {indexes: [{fields: ['account_id']}, {fields: ['open_id']}]});

sequelizeWrap.sync();