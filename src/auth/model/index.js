var TYPE = require('sequelize');
var sequelizeWrap = require('../../lib/sequelizeWrap');

sequelizeWrap.define('user', {
    id: {type: TYPE.STRING(64), primaryKey: true},
    username: {type: TYPE.STRING(64), allowNull: false, unique: true},
    password: {type: TYPE.STRING(64), allowNull: false},
    salt: {type: TYPE.STRING(64), allowNull: false},
    created_at: {type: TYPE.FLOAT, allowNull: false},
    updated_at: {type: TYPE.FLOAT, allowNull: false}
});

sequelizeWrap.define('user_delete', {
    id: {type: TYPE.STRING(64), primaryKey: true},
    username: {type: TYPE.STRING(64), allowNull: false, unique: true},
    password: {type: TYPE.STRING(64), allowNull: false},
    salt: {type: TYPE.STRING(64), allowNull: false},
    created_at: {type: TYPE.FLOAT, allowNull: false},
    updated_at: {type: TYPE.FLOAT, allowNull: false}
});

//sequelizeWrap.define('user_profile', {
//    id: {type: TYPE.STRING(64), primaryKey: true}
//});

sequelizeWrap.sync();