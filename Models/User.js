const { DataTypes } = require("sequelize");
const sequelize = require("../inc/DB.js");

const User = sequelize.define("User", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: DataTypes.STRING,
  phoneNumber: {
    type: DataTypes.STRING, 
    allowNull:false,
    unique:true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,     
  },
  password: DataTypes.STRING,
  rol: DataTypes.STRING,
}, {
  timestamps: true,
});
module.exports = User;
