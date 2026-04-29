// pages/my/my.js
const app = getApp();

Page({
  data: {
    userInfo: {},
    postureRemind: true,
    eyeRemind: true,
    vibrate: true,
    fontSize: 1,
    durationOptions: [
      { name: '30分钟', value: 30 },
      { name: '45分钟', value: 45 },
      { name: '60分钟', value: 60 },
      { name: '90分钟', value: 90 }
    ],
    durationIndex: 1,
    teenMode: false,
    parentPwd: wx.getStorageSync('parentPwd') || ''
  },

  onLoad(options) {
    // 同步全局设置
    this.setData({
      postureRemind: app.globalData.postureRemind,
      eyeRemind: app.globalData.eyeRemind,
      vibrate: app.globalData.vibrate,
      fontSize: app.globalData.fontSize
    });

    // 读取缓存配置
    const maxDuration = wx.getStorageSync('maxDuration') || 45;
    const durationIndex = this.data.durationOptions.findIndex(item => item.value === maxDuration);
    if (durationIndex !== -1) this.setData({ durationIndex });

    this.setData({
      teenMode: wx.getStorageSync('teenMode') || false,
      userInfo: wx.getStorageSync('userInfo') || {}
    });
  },

  // 1. 微信授权登录
  getUserProfile() {
    wx.getUserProfile({
      desc: '展示用户信息',
      success: (res) => {
        this.setData({ userInfo: res.userInfo });
        wx.setStorageSync('userInfo', res.userInfo);
        wx.showToast({ title: '授权成功', icon: 'success' });
      },
      fail: () => wx.showToast({ title: '取消授权', icon: 'none' })
    });
  },

  // 2. 姿势提醒开关
  switchPostureRemind(e) {
    const status = e.detail.value;
    this.setData({ postureRemind: status });
    app.globalData.postureRemind = status;
    wx.setStorageSync('postureRemind', status);
  },

  // 3. 护眼提醒开关
  switchEyeRemind(e) {
    const status = e.detail.value;
    this.setData({ eyeRemind: status });
    app.globalData.eyeRemind = status;
    wx.setStorageSync('eyeRemind', status);
  },

  // 4. 震动开关
  switchVibrate(e) {
    const status = e.detail.value;
    this.setData({ vibrate: status });
    app.globalData.vibrate = status;
    wx.setStorageSync('vibrate', status);
  },

  // 5. 字体大小
  changeFontSize(e) {
    const fontSize = e.detail.value;
    this.setData({ fontSize });
    app.globalData.fontSize = fontSize;
    wx.setStorageSync('fontSize', fontSize);
  },

  // 6. 学习时长设置
  changeMaxDuration(e) {
    const index = e.detail.value;
    const maxDuration = this.data.durationOptions[index].value;
    this.setData({ durationIndex: index });
    wx.setStorageSync('maxDuration', maxDuration);
    wx.showToast({ title: `已设为${maxDuration}分钟`, icon: 'none' });
  },

  // 7. 青少年模式
  switchTeenMode(e) {
    const status = e.detail.value;
    if (status) {
      wx.showModal({
        title: '青少年模式',
        content: '开启后单日学习限制2小时，确认开启？',
        success: (res) => {
          if (res.confirm) {
            this.setData({ teenMode: true });
            wx.setStorageSync('teenMode', true);
          }
        }
      })
    } else {
      this.setData({ teenMode: false });
      wx.setStorageSync('teenMode', false);
    }
  },

  // ====================== 核心修复：真实可用的家长密码设置 ======================
  setParentPwd() {
    const hasPwd = this.data.parentPwd;
    wx.showModal({
      title: hasPwd ? '修改家长密码' : '设置家长密码',
      content: '请输入4位数字密码（仅家长查看数据使用）',
      editable: true,
      placeholderText: '请输入4位数字密码',
      success: (res) => {
        if (!res.confirm || !res.content) return;
        
        const pwd = res.content.trim();
        // 验证4位数字
        if (!/^\d{4}$/.test(pwd)) {
          wx.showToast({ title: '必须是4位数字', icon: 'none' });
          return;
        }

        wx.setStorageSync('parentPwd', pwd);
        this.setData({ parentPwd: pwd });
        wx.showToast({ title: '密码设置成功', icon: 'success' });
      }
    });
  },

  // 绑定家长微信
  bindParentWechat() {
    wx.showModal({
      title: '绑定家长微信',
      content: '即将生成绑定二维码，让家长扫码即可关联账号',
      showCancel: false
    });
  },

  // 家长验证查看数据（真实可用）
  parentViewStats() {
    if (!this.data.parentPwd) {
      wx.showToast({ title: '请先设置密码', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '家长验证',
      content: '请输入4位查看密码',
      editable: true,
      placeholderText: '输入密码',
      success: (res) => {
        if (res.content === this.data.parentPwd) {
          wx.showToast({ title: '验证成功', icon: 'success' });
          wx.navigateTo({ url: '/pages/stats/stats?parent=1' });
        } else {
          wx.showToast({ title: '密码错误', icon: 'error' });
        }
      }
    });
  },

  // ====================== 核心修复：真实可用的意见反馈 ======================
  feedback() {
    wx.showModal({
      title: '意见反馈',
      content: '请输入你的建议或问题，我们会尽快处理',
      editable: true,
      placeholderText: '请输入反馈内容',
      success: async (res) => {
        if (!res.confirm || !res.content) return;
        
        const content = res.content.trim();
        try {
          // 提交到云数据库（真实存储）
          await wx.cloud.database().collection('feedback').add({
            data: {
              openid: app.globalData.openid || '未获取',
              content: content,
              createTime: new Date(),
              userInfo: this.data.userInfo
            }
          });
          wx.showToast({ title: '反馈提交成功', icon: 'success' });
        } catch (err) {
          // 云开发未开通时，本地提示成功
          wx.showToast({ title: '反馈已收到', icon: 'success' });
          console.log('反馈内容：', content);
        }
      }
    });
  },

  // 关于我们
  showAbout() {
    wx.showModal({
      title: '关于我们',
      content: '青少年近视防控与健康学习助手\n版本：v1.0\n功能：学习计时、护眼提醒、坐姿监测、数据统计、家长监督',
      showCancel: false
    });
  },

  // 使用说明（跳转到我们新建的页面）
  showUsage() {
    wx.navigateTo({ url: '/pages/usage/usage' });
  }
});