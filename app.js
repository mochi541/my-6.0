// app.js
App({
  globalData: {
    openid: '',
    cloudEnvId: 'cloud1-2gl4b6myfe79dca2',
    fontSize: 1,
    postureRemind: true,
    eyeRemind: true,
    vibrate: true,
    user_info: null
  },

  onLaunch() {
    const systemInfo = wx.getSystemInfoSync()
    console.log('系统环境:', systemInfo.platform)

    // 只在微信小程序环境下初始化云开发
    if (systemInfo.platform !== 'devtools' && 
        systemInfo.platform !== 'android' && 
        systemInfo.platform !== 'ios') {
      console.log('非小程序环境,跳过云开发初始化')
      return
    }

    if (!wx.cloud) {
      console.log('当前环境不支持云开发')
      return
    }
    
    wx.cloud.init({
      env: this.globalData.cloudEnvId,
      traceUser: true,
    })

    try {
      require('./tfjs/tf-core.min.js')
      require('./tfjs/tf-converter.min.js')
      require('./tfjs/tf-layers.min.js')
      require('./tfjs/mobilenet.min.js')
      console.log("✅ AI姿态库加载成功")
    } catch (e) {
      console.log("AI库未加载,不影响主功能")
    }

    // 尝试获取openid(如果云开发可用)
    this.getWxOpenid()
  },

  getWxOpenid() {
    // 检查云开发是否可用
    if (!wx.cloud) {
      console.log('云开发不可用,使用本地存储')
      const localOpenid = wx.getStorageSync('openid')
      if (localOpenid) {
        this.globalData.openid = localOpenid
      } else {
        // 生成一个临时ID
        const tempId = 'temp_' + Date.now()
        this.globalData.openid = tempId
        wx.setStorageSync('openid', tempId)
      }
      return
    }

    wx.cloud.callFunction({
      name: 'login',
      success: (res) => {
        this.globalData.openid = res.result.openid
        console.log('✅ openid已获取:', res.result.openid)
        wx.setStorageSync('openid', res.result.openid)
      },
      fail: (err) => {
        console.error('❌ 获取openid失败:', err)
        // 使用本地临时ID
        const tempId = 'temp_' + Date.now()
        this.globalData.openid = tempId
        wx.setStorageSync('openid', tempId)
        console.log('使用临时ID:', tempId)
      }
    })
  }
})