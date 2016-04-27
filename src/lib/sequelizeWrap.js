var _ = require('lodash');
var Sequelize = require('sequelize');
var sequelize = instance();

var defaultOption = {
    timestamps: false,
    freezeTableName: true
};

exports.define = define;
exports.sync = sync;

function define(modelName, attributes, options) {
    return sequelize.define(modelName, attributes, _.extend((options || {}), defaultOption));
}

function sync(options) {
    // 每次sync完之后需要生成一个新的实例
    var preSequelize = sequelize;
    sequelize = instance();
    return preSequelize.sync(options);
}

function instance() {
    return new Sequelize(global.mysqlOption.database, global.mysqlOption.user, global.mysqlOption.password, {
        host: global.mysqlOption.host,
        dialect: 'mysql',
        pool: {
            max: global.mysqlOption.connectionLimit,
            min: 0,
            idle: 10000
        }
    });
}
