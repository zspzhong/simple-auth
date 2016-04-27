exports.verificationCode = verificationCode;
exports.loginInfo = loginInfo;

function verificationCode(phoneNumber, reason) {
    return 'verification_code_' + reason + '_' + phoneNumber;
}

function loginInfo(username) {
    return 'login_info_' + username;
}