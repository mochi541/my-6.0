// app.js
App({
  globalData: {
    openid: '', // 存储用户openid
    cloudEnvId: 'cloud1-2gl4b6myfe79dca2', // 你的云环境ID
    fontSize: 1, // 全局字体大小
    postureRemind: true, // 姿势提醒开关
    eyeRemind: true, // 护眼提醒开关
    vibrate: true, // 震动提醒开关
    user_info: null // 新增：存储用户信息
  },

  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      wx.showToast({
        title: '请升级微信版本以使用云开发',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    wx.cloud.init({
      env: this.globalData.cloudEnvId,
      traceUser: true,
    });

    // ======================================
    // 我帮你加入 AI 坐姿监测库（不影响你原有功能）
    // ======================================
    try {
      require('./tfjs/tf-core.min.js')
      require('./tfjs/tf-converter.min.js')
      require('./tfjs/tf-layers.min.js')
      require('./tfjs/mobilenet.min.js')
      console.log("✅ AI姿态库加载成功")
    } catch (e) {
      console.log("AI库未加载，不影响主功能")
    }

    // 获取用户openid
    this.getWxOpenid();
  },

  getWxOpenid() {
    wx.cloud.callFunction({
      name: 'login',
      success: (res) => {
        this.globalData.openid = res.result.openid;
        console.log('✅ openid已获取：', res.result.openid);
        wx.setStorageSync('openid', res.result.openid);
      },
      fail: (err) => {
        console.error('❌ 获取openid失败：', err);
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  }
});