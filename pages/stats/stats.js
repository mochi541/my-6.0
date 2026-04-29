// my/pages/stats/stats.js
const app = getApp();
// 关键：直接引用 wxcharts-min.js（无需重命名）
const wxCharts = require('../../utils/wxcharts-min.js');

Page({
  data: {
    inputPwd: "",
    isParentVerified: false,
    parentPwd: "123456",
    timeRange: 7,
    avgDuration: 0, 
    restCompletionRate: 0,
    userName: '用户',
    showAuthBtn: false,
    // 缓存图表实例（原生wx-charts，无循环引用）
    lineChartInstance: null,
    barChartInstance: null
  },

  onLoad(options) {
    // 云开发初始化
    if (!wx.cloud) {
      wx.showToast({ title: '请使用2.2.3及以上基础库', icon: 'none' });
      return;
    }
    wx.cloud.init({
      env: app.globalData.cloudEnvId || 'cloud1',
      traceUser: true,
    });

    // 检查用户信息
    if (app.globalData && app.globalData.user_info) {
      this.setData({ userName: app.globalData.user_info.nickName || '用户' });
    } else {
      this.setData({ showAuthBtn: true });
    }

    // 关键：页面加载时开启分享功能（必须）
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline'] // 支持分享给好友+朋友圈
    });
  },

  // 密码输入
  onPwdInput(e) {
    this.setData({ inputPwd: e.detail.value });
  },

  // 家长验证（核心：验证后直接渲染图表）
  verifyParentPwd() {
    if (this.data.inputPwd !== this.data.parentPwd) {
      wx.showToast({ title: '密码错误', icon: 'none' });
      return;
    }

    this.setData({ isParentVerified: true }, () => {
      // 加载数据并渲染图表
      this.loadMockData();
    });
  },

  // 退出家长模式
  exitParentMode() {
    this.setData({
      isParentVerified: false,
      inputPwd: ""
    });
    wx.showToast({ title: '已退出家长模式', icon: 'success' });
  },

  // 切换时间范围
  changeTimeRange(e) {
    const range = e.currentTarget.dataset.range;
    this.setData({ timeRange: range }, () => {
      this.loadMockData();
    });
  },

  // 加载模拟数据+渲染图表（核心：原生wx-charts，无超时）
  loadMockData() {
    const range = this.data.timeRange;
    const dates = [];
    const durations = [];
    const completionRates = [];

    // 生成模拟数据
    for (let i = range - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      const studyDuration = Math.floor(Math.random() * 120) + 30;
      const restTimes = Math.floor(Math.random() * 10);
      const requiredRestTimes = 10;
      const completionRate = Math.round((restTimes / requiredRestTimes) * 100);

      dates.push(dateStr);
      durations.push(studyDuration);
      completionRates.push(completionRate);
    }

    // 计算平均值
    const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / range);
    const restCompletionRate = Math.round(completionRates.reduce((a, b) => a + b, 0) / range);

    this.setData({
      avgDuration,
      restCompletionRate
    }, () => {
      // 关键：增加500ms延迟，避开模拟器超时检测
      setTimeout(() => {
        wx.getSystemInfo({
          success: (res) => {
            const chartWidth = res.windowWidth * 0.9; // 图表宽度=屏幕宽度*90%
            this.renderLineChart(chartWidth, dates, durations); // 折线图
            this.renderBarChart(chartWidth, dates, completionRates); // 柱状图
          }
        });
      }, 500);
    });
  },

  // 渲染折线图（修复宽高比例+X轴显示）
  renderLineChart(width, categories, data) {
    const systemInfo = wx.getSystemInfoSync();
    const chartHeight = systemInfo.windowWidth / 750 * 400;
    if (this.data.lineChartInstance) {
      this.data.lineChartInstance.updateData({
        categories,
        series: [{
          name: '学习时长（分钟）',
          data,
          color: '#07c160'
        }]
      });
    } else {
      this.data.lineChartInstance = new wxCharts({
        canvasId: 'lineChart',
        type: 'line',
        categories: categories,
        xAxis: {
          disableGrid: false,
          fontColor: '#666',
          fontSize: 11,
          offsetY: 10
        },
        series: [{
          name: '学习时长（分钟）',
          data: data,
          color: '#07c160',
          format: (val) => val + '分钟'
        }],
        yAxis: {
          title: '时长（分钟）',
          min: 0,
          gridColor: '#eee'
        },
        width: width,
        height: chartHeight,
        title: {
          name: `${this.data.userName} 每日学习时长趋势`,
          fontSize: 14
        },
        extra: {
          grid: {
            bottom: 25
          }
        }
      });
    }
  },

  // 渲染柱状图（修复宽高比例+X轴显示）
  renderBarChart(width, categories, data) {
    const systemInfo = wx.getSystemInfoSync();
    const chartHeight = systemInfo.windowWidth / 750 * 400;
    if (this.data.barChartInstance) {
      this.data.barChartInstance.updateData({
        categories,
        series: [{
          name: '完成率（%）',
          data,
          color: '#1989fa'
        }]
      });
    } else {
      this.data.barChartInstance = new wxCharts({
        canvasId: 'barChart',
        type: 'column',
        categories: categories,
        xAxis: {
          disableGrid: false,
          fontColor: '#666',
          fontSize: 11,
          offsetY: 10
        },
        series: [{
          name: '完成率（%）',
          data: data,
          color: '#1989fa',
          format: (val) => val + '%'
        }],
        yAxis: {
          title: '完成率（%）',
          min: 0,
          max: 100,
          gridColor: '#eee'
        },
        width: width,
        height: chartHeight,
        title: {
          name: `${this.data.userName} 每日休息完成率`,
          fontSize: 14
        },
        extra: {
          column: {
            width: 20
          },
          grid: {
            bottom: 25
          }
        }
      });
    }
  },

  // 导出数据
  exportData() {
    const { avgDuration, restCompletionRate, timeRange, userName } = this.data;
    const exportData = {
      用户名: userName,
      统计时间范围: `${timeRange}天`,
      日均用眼时长: `${avgDuration}分钟`,
      平均休息完成率: `${restCompletionRate}%`
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    wx.setClipboardData({
      data: dataStr,
      success: () => {
        wx.showToast({ title: '数据已复制到剪贴板', icon: 'success' });
      },
      fail: (err) => {
        wx.showToast({ title: '复制失败', icon: 'none' });
        console.error('复制失败：', err);
      }
    });
  },

  // 修复：分享数据按钮逻辑（提示用户用右上角分享，兼容模拟器）
  shareData() {
    wx.showModal({
      title: '分享提示',
      content: '请点击小程序右上角「···」按钮，选择“转发给朋友”或“分享到朋友圈”',
      showCancel: false,
      confirmText: '知道了',
      // 真机下可引导用户触发原生分享
      success: () => {
        // 真机中主动唤起分享面板（仅支持基础库2.18.1+）
        if (wx.canIUse('shareAppMessage')) {
          wx.showToast({ title: '请在右上角完成分享', icon: 'none' });
        }
      }
    });
  },

  // 用户授权
  handleUserAuth() {
    wx.getUserProfile({
      desc: '用于展示用户专属的用眼统计数据',
      success: (res) => {
        this.setData({ 
          userName: res.userInfo.nickName || '用户',
          showAuthBtn: false 
        });
        app.globalData.user_info = res.userInfo;
        wx.showToast({ title: '授权成功', icon: 'success' });
      },
      fail: (err) => {
        console.log('用户拒绝授权', err);
        this.setData({ showAuthBtn: false });
      }
    });
  },

  // 页面生命周期：分享给好友（小程序原生，必须保留）
  onShareAppMessage() {
    const { avgDuration, restCompletionRate, timeRange, userName } = this.data;
    return {
      title: `${userName} 近${timeRange}天用眼统计：日均${avgDuration}分钟，休息完成率${restCompletionRate}%`,
      path: '/pages/stats/stats'
    };
  },

  // 页面生命周期：分享到朋友圈（小程序原生）
  onShareTimeline() {
    const { avgDuration, restCompletionRate, timeRange, userName } = this.data;
    return {
      title: `${userName} 近${timeRange}天用眼统计：日均${avgDuration}分钟，休息完成率${restCompletionRate}% | 青少年近视防控`
    };
  }
});