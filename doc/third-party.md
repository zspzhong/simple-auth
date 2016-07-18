#third-party

## register
* `comment`: 根据帐号id获取第三方信息
* `url`: /thirdParty/accountId/:accountId
* `method`: get
* `res`: {code: number, result: {thirdParty: []}}
```
thirdParty: array, 跟帐号相关联的第三方信息, 即绑定的第三方帐号
```

## wechatUserInfoByCode
* `comment`: 根据code(微信oauth2.0第二步返回的authorization_code)获取微信用户信息
* `url`: /thirdParty/wechat/userInfo
* `method`: get
* `query`: {appId: string|required, secret: string|required, code: string|required}
* `res`: {code: number, result: {userInfo: {}, isBound: boolean}}
```
userInfo: 第三方平台oauth授权所能拿到的公开信息
isBound: 是否已绑定平台帐号
```

## thirdPartyByOpenId
* `comment`: 根据openId获取第三方信息
* `url`: /thirdParty/openId/:openId
* `method`: get
* `res`: {code: number, result: {thirdParty: {}}}

## accountByOpenId
* `comment`: 根据openId获取帐号信息
* `url`: /thirdParty/account/openId/:openId
* `method`: get
* `res`: {code: number, result: {account: {}}}

## login
* `comment`: 微信使用openId+accessToken登录方式, 若已绑定平台帐号, 最终登录状态与用户名密码登录无区别
* `url`: /thirdParty/wechat/login
* `method`: post
* `body`: {openId: string|required, accessToken: string|required, duration: number|default: 3600 * 24 * 30}
```
duration: 单位秒
```
* `res`: {code: number, result: {accountId: string, expireTime: number, token: string, isTemporary: boolean}}
```
accountId: 若已绑定平台账户, 结果为平台帐号id
```

## thirdPartyBind
* `comment`: 帐号与第三方绑定
* `url`: /thirdParty/bind
* `method`: post
* `body`: {openId: string|required, openIdToken: string|required, accountId: string|required, accountIdToken: string|required}
* `res`: {code: number, result: {}}
