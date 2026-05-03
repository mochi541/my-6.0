// pages/my/my.js
const app = getApp();

Page({
  data: {
    userInfo: {},
    postureRemind: true,
    eyeRemind: true,
    vibrate: true,
    fontSize: 1.0,
    durationOptions: [
      { name: '30分钟', value: 30 },
      { name: '45分钟', value: 45 },
      { name: '60分钟', value: 60 },
      { name: '90分钟', value: 90 }
    ],
    durationIndex: 1,
    teenMode: false,
    parentPwd: wx.getStorageSync('parentPwd') || '',
    showPwdModal: false,
    newPwd: '',
    pwdModalTitle: '设置家长密码',
    showVerifyModal: false,
    verifyPwd: ''
  },

  onLoad(options) {
    const fontSize = parseFloat(wx.getStorageSync('fontSize') || 1.0);
    this.setData({
      postureRemind: app.globalData.postureRemind,
      eyeRemind: app.globalData.eyeRemind,
      vibrate: app.globalData.vibrate,
      fontSize: fontSize
    });

    const maxDuration = wx.getStorageSync('maxDuration') || 45;
    const durationIndex = this.data.durationOptions.findIndex(item => item.value === maxDuration);
    if (durationIndex !== -1) this.setData({ durationIndex });

    this.setData({
      teenMode: wx.getStorageSync('teenMode') || false,
      userInfo: wx.getStorageSync('userInfo') || {}
    });
  },

  onShow() {
    const fontSize = parseFloat(wx.getStorageSync('fontSize') || 1.0);
    this.setData({ fontSize: fontSize });
    app.globalData.fontSize = fontSize;
  },

  getUserProfile() {
    const systemInfo = wx.getSystemInfoSync()
    console.log('当前平台:', systemInfo.platform)

    if (systemInfo.platform === 'android' || systemInfo.platform === 'ios') {
      wx.showToast({
        title: 'APK环境暂不支持头像获取',
        icon: 'none',
        duration: 2000
      })
      return
    }

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

  switchPostureRemind(e) {
    const status = e.detail.value;
    this.setData({ postureRemind: status });
    app.globalData.postureRemind = status;
    wx.setStorageSync('postureRemind', status);
  },

  switchEyeRemind(e) {
    const status = e.detail.value;
    this.setData({ eyeRemind: status });
    app.globalData.eyeRemind = status;
    wx.setStorageSync('eyeRemind', status);
  },

  switchVibrate(e) {
    const status = e.detail.value;
    this.setData({ vibrate: status });
    app.globalData.vibrate = status;
    wx.setStorageSync('vibrate', status);
  },

  changeFontSize(e) {
    const fontSize = parseFloat(e.detail.value).toFixed(1);
    console.log('字体大小改变为:', fontSize);
    
    this.setData({ fontSize: parseFloat(fontSize) }, () => {
      app.globalData.fontSize = parseFloat(fontSize);
      wx.setStorageSync('fontSize', parseFloat(fontSize));
      console.log('字体大小已保存');
    });
  },

  changeMaxDuration(e) {
    const index = e.detail.value;
    const maxDuration = this.data.durationOptions[index].value;
    this.setData({ durationIndex: index });
    wx.setStorageSync('maxDuration', maxDuration);
    wx.showToast({ title: `已设为${maxDuration}分钟`, icon: 'none' });
  },

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

  setParentPwd() {
    const hasPwd = this.data.parentPwd;
    this.setData({
      showPwdModal: true,
      newPwd: '',
      pwdModalTitle: hasPwd ? '修改家长密码' : '设置家长密码'
    });
  },

  closePwdModal() {
    this.setData({
      showPwdModal: false,
      newPwd: ''
    });
  },

  onPwdInput(e) {
    this.setData({ newPwd: e.detail.value });
  },

  confirmSetPwd() {
    const pwd = this.data.newPwd.trim();
    
    if (!/^\d{4}$/.test(pwd)) {
      wx.showToast({ title: '必须是4位数字', icon: 'none' });
      return;
    }

    wx.setStorageSync('parentPwd', pwd);
    this.setData({ 
      parentPwd: pwd,
      showPwdModal: false,
      newPwd: ''
    });
    wx.showToast({ title: '密码设置成功', icon: 'success' });
  },

  bindParentWechat() {
    wx.showModal({
      title: '绑定家长微信',
      content: '即将生成绑定二维码，让家长扫码即可关联账号',
      showCancel: false
    });
  },

  parentViewStats() {
    if (!this.data.parentPwd) {
      wx.showToast({ title: '请先设置密码', icon: 'none' });
      return;
    }

    this.setData({
      showVerifyModal: true,
      verifyPwd: ''
    });
  },

  closeVerifyModal() {
    this.setData({
      showVerifyModal: false,
      verifyPwd: ''
    });
  },

  onVerifyPwdInput(e) {
    this.setData({ verifyPwd: e.detail.value });
  },

  confirmVerifyPwd() {
    const inputPwd = this.data.verifyPwd.trim();
    
    if (!inputPwd) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }

    if (inputPwd === this.data.parentPwd) {
      wx.showToast({ title: '验证成功', icon: 'success' });
      this.setData({
        showVerifyModal: false,
        verifyPwd: ''
      });
      wx.navigateTo({ url: '/pages/stats/stats?parent=1' });
    } else {
      wx.showToast({ title: '密码错误', icon: 'none' });
      this.setData({ verifyPwd: '' });
    }
  },

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
          const feedbacks = wx.getStorageSync('feedbacks') || []
          feedbacks.push({
            openid: app.globalData.openid || '未获取',
            content: content,
            createTime: new Date().toISOString(),
            userInfo: this.data.userInfo
          })
          wx.setStorageSync('feedbacks', feedbacks)
          wx.showToast({ title: '反馈已保存到本地', icon: 'success' });
        }
      }
    });
  },

  showAbout() {
    wx.showModal({
      title: '关于我们',
      content: '青少年近视防控与健康学习助手\n版本：v1.0\n功能：学习计时、护眼提醒、坐姿监测、数据统计、家长监督',
      showCancel: false
    });
  },

  showUsage() {
    wx.navigateTo({ url: '/pages/usage/usage' });
  }
});