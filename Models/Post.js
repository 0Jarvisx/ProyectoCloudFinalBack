const { DataTypes } = require("sequelize");
const sequelize = require("../inc/DB.js");
const User = require('./User.js');

const Post = sequelize.define('Post', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    image: {
      type: DataTypes.STRING, 
      allowNull: true,
    },
  }, {
    timestamps: true,
  });
  

  User.hasMany(Post, { foreignKey: 'userId', onDelete: 'CASCADE' });
  Post.belongsTo(User, { foreignKey: 'userId' });
  
  module.exports = Post;


