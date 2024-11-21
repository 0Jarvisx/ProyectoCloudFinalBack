const bcrypt = require('bcrypt')

exports.hashPassword = async (password)=> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
}

exports.comparePassword = async (password, hashedPassword)=> {
    const result = await bcrypt.compare(password, hashedPassword);
    return result;
}
