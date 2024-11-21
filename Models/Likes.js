const { DataTypes } = require("sequelize");
const sequelize = require("../inc/DB.js");

const User = require('./User');
const Post = require('./Post');

const Like = sequelize.define('Like', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
}, {
  timestamps: true,
});

// Relaciones
User.hasMany(Like, { foreignKey: 'userId', onDelete: 'CASCADE' });
Like.belongsTo(User, { foreignKey: 'userId' });

Post.hasMany(Like, { foreignKey: 'postId', onDelete: 'CASCADE' });
Like.belongsTo(Post, { foreignKey: 'postId' });

module.exports = Like;