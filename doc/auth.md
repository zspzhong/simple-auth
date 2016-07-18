#auth

## register
* `comment`: 注册
* `url`: /register
* `method`: post
* `body`: {username: string|required, password: string|required}
* `res`: {code: number, result: {accountId}}

## login
* `comment`: 登录
* `url`: /login
* `method`: post
* `body`: {username: string|required, password: string|required, duration: number|default: 3600 * 24 * 30}
```
duration: 单位秒
```
* `res`: {code: number, result: {accountId, expireTime, token, isTemporary}}

## temporaryLogin
* `comment`: 临时登录, 不需要密码
* `url`: /temporary/login
* `method`: post
* `body`: {username: string|required, duration: number|default: 3600 * 24 * 30}
```
username: 临时登录时, 该值只是一个唯一标志, 不一定是可用的用户名
duration: 单位秒
```
* `res`: {code: number, result: {accountId, expireTime, token, isTemporary}}

## logout
* `comment`: 登出
* `url`: /logout
* `method`: post
* `body`: {token: string|required}
```
token: 登录流程获取的token
```
* `res`: {code: number, result: {}}

## updatePassword
* `comment`: 修改密码
* `url`: /password/update
* `method`: post
* `body`: {username: string|required, newPassword: string|required, oldPassword: string|required}
* `res`: {code: number, result: {}}

## resetPassword
* `comment`: 重置密码
* `url`: /password/reset
* `method`: post
* `body`: {username: string|required, password: string|required}
* `res`: {code: number, result: {}}

## checkPassword
* `comment`: 校验密码
* `url`: /password/check
* `method`: post
* `body`: {username: string|required, password: string|required}
* `res`: {code: number, result: {isMatch: boolean}}

## checkToken
* `comment`: 检查登录token
* `url`: /token/check/:token
* `method`: get
* `res`: {code: number, result: {isValid: boolean, accountId: string}}
```
accountId: 只有isValid为true时才有值
```

## accountById
* `comment`: 根据id获取帐号信息
* `url`: /account/id/:id
* `method`: get
* `res`: {code: number, result: {id: string, username: string, relatedThirdParty: []}}

## accountByUsername
* `comment`: 根据username获取帐号信息
* `url`: /account/username/:username
* `method`: get
* `res`: {code: number, result: {id: string, username: string, relatedThirdParty: []}}

## accountIdByToken
* `comment`: 根据token获取帐号id
* `url`: /accountId/token/:token
* `method`: get
* `res`: {code: number, result: {accountId: string}}

## deleteAccountById
* `comment`: 根据帐号id删除帐号
* `url`: /account/delete/:accountId
* `method`: post
* `res`: {code: number, result: {accountId: string}}

## tokenInfo
* `comment`: 获取token信息
* `url`: /token/:token
* `method`: get
* `res`: {code: number, result: {accountId: string, expireTime: number, token: string, isTemporary: boolean}}
