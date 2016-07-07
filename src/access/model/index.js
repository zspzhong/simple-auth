var TYPE = require('sequelize');
var sequelizeWrap = require('../../lib/sequelizeWrap');

// 访问控制
sequelizeWrap.define('allow_access', {
    id: {type: TYPE.STRING(64), primaryKey: true},
    key: {type: TYPE.STRING(64), allowNull: false, unique: true},
    secret: {type: TYPE.STRING(64), allowNull: false, unique: true},
    created_at: {type: TYPE.FLOAT, allowNull: false},
    updated_at: {type: TYPE.FLOAT, allowNull: false}
}, {indexes: [{fields: ['key']}]});

sequelizeWrap.define('allow_access_delete', {
    id: {type: TYPE.STRING(64), primaryKey: true},
    key: {type: TYPE.STRING(64), allowNull: false, unique: true},
    secret: {type: TYPE.STRING(64), allowNull: false, unique: true},
    created_at: {type: TYPE.FLOAT, allowNull: false},
    updated_at: {type: TYPE.FLOAT, allowNull: false}
}, {indexes: [{fields: ['key']}]});