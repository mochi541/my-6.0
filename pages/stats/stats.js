// my/pages/stats/stats.js
const app = getApp();
const db = wx.cloud.database();
// 关键：直接引用 wxcharts-min.js（无需重命名）
const wxCharts = require('../../utils/wxcharts-min.js');

Page({
  data: {
    inputPwd: "",
    isParentVerified: false,
    parentPwd: '', // 初始为空，在onShow中读取
    timeRange: 7,
    avgDuration: 0, 
    restCompletionRate: 0,
    userName: '用户',
    showAuthBtn: false,
    // 缓存图表实例（原生wx-charts，无循环引用）
    lineChartInstance: null,
    barChartInstance: null,
    // 真实数据存储
    studyDataList: []
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

  onShow() {
    // 每次显示页面时重新读取最新密码
    const latestPwd = wx.getStorageSync('parentPwd') || '';
    this.setData({ parentPwd: latestPwd });
  },

  // 密码输入
  onPwdInput(e) {
    this.setData({ inputPwd: e.detail.value });
  },

  // 家长验证（核心：验证后直接渲染图表）
  verifyParentPwd() {
    // 检查是否已设置家长密码
    if (!this.data.parentPwd) {
      wx.showModal({
        title: '提示',
        content: '请先在"我的"页面设置家长密码',
        showCancel: false,
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack(); // 返回上一页
          }
        }
      });
      return;
    }

    if (!this.data.inputPwd) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return;
    }

    // 去除空格后对比
    const inputPwd = this.data.inputPwd.trim();
    const savedPwd = this.data.parentPwd.trim();

    if (inputPwd !== savedPwd) {
      wx.showToast({ title: '密码错误', icon: 'none' });
      return;
    }

    this.setData({ isParentVerified: true }, () => {
      // 加载真实数据并渲染图表
      this.loadRealData();
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
      this.loadRealData();
    });
  },

  // 加载真实数据+渲染图表
  async loadRealData() {
    wx.showLoading({ title: '加载中...' });
    
    try {
      // 获取openid
      const openid = app.globalData.openid || wx.getStorageSync('openid');
      
      if (!openid) {
        wx.hideLoading();
        wx.showToast({ title: '未获取到用户信息', icon: 'none' });
        return;
      }

      // 计算起始日期
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - this.data.timeRange + 1);
      
      const startDateStr = this.formatDate(startDate);
      const endDateStr = this.formatDate(endDate);

      // 从云数据库查询学习记录
      const res = await db.collection('study_records')
        .where({
          openid: openid,
          date: db.command.gte(startDateStr).and(db.command.lte(endDateStr))
        })
        .orderBy('createTime', 'asc')
        .get();

      const records = res.data || [];
      
      if (records.length === 0) {
        wx.hideLoading();
        wx.showToast({ title: '暂无学习数据', icon: 'none' });
        // 显示空状态图表
        this.renderEmptyCharts();
        return;
      }

      // 按日期分组统计
      const dateMap = {};
      records.forEach(record => {
        const date = record.date;
        if (!dateMap[date]) {
          dateMap[date] = {
            totalDuration: 0,
            remindCount: 0,
            count: 0
          };
        }
        dateMap[date].totalDuration += record.duration || 0;
        dateMap[date].remindCount += record.remindCount || 0;
        dateMap[date].count += 1;
      });

      // 生成完整的日期序列（包括没有学习的日期）
      const dates = [];
      const durations = [];
      const completionRates = [];
      
      for (let i = 0; i < this.data.timeRange; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (this.data.timeRange - 1 - i));
        const dateStr = this.formatDate(date);
        const displayDate = `${date.getMonth() + 1}/${date.getDate()}`;
        
        dates.push(displayDate);
        
        if (dateMap[dateStr]) {
          durations.push(dateMap[dateStr].totalDuration);
          // 计算完成率：假设每天应该休息次数 = 学习时长/20分钟
          const expectedRest = Math.max(1, Math.floor(dateMap[dateStr].totalDuration / 20));
          const actualRest = dateMap[dateStr].remindCount;
          const rate = Math.min(100, Math.round((actualRest / expectedRest) * 100));
          completionRates.push(rate);
        } else {
          durations.push(0);
          completionRates.push(0);
        }
      }

      // 计算平均值
      const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / this.data.timeRange);
      const restCompletionRate = Math.round(completionRates.reduce((a, b) => a + b, 0) / this.data.timeRange);

      this.setData({
        avgDuration,
        restCompletionRate,
        studyDataList: records
      });

      wx.hideLoading();

      // 渲染图表
      setTimeout(() => {
        wx.getSystemInfo({
          success: (res) => {
            const chartWidth = res.windowWidth * 0.9;
            this.renderLineChart(chartWidth, dates, durations);
            this.renderBarChart(chartWidth, dates, completionRates);
          }
        });
      }, 300);

    } catch (err) {
      wx.hideLoading();
      console.error('加载数据失败', err);
      wx.showToast({ title: '加载数据失败', icon: 'none' });
    }
  },

  // 渲染空状态图表
  renderEmptyCharts() {
    wx.getSystemInfo({
      success: (res) => {
        const chartWidth = res.windowWidth * 0.9;
        const dates = [];
        const durations = [];
        const completionRates = [];
        
        for (let i = 0; i < this.data.timeRange; i++) {
          const date = new Date();
          date.setDate(date.getDate() - (this.data.timeRange - 1 - i));
          dates.push(`${date.getMonth() + 1}/${date.getDate()}`);
          durations.push(0);
          completionRates.push(0);
        }
        
        this.renderLineChart(chartWidth, dates, durations);
        this.renderBarChart(chartWidth, dates, completionRates);
      }
    });
  },

  // 渲染折线图
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

  // 渲染柱状图
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
    const { avgDuration, restCompletionRate, timeRange, userName, studyDataList } = this.data;
    const exportData = {
      用户名: userName,
      统计时间范围: `${timeRange}天`,
      日均用眼时长: `${avgDuration}分钟`,
      平均休息完成率: `${restCompletionRate}%`,
      详细记录: studyDataList.map(item => ({
        日期: item.date,
        学习时长: item.duration + '分钟',
        提醒次数: item.remindCount
      }))
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
      content: '请点击小程序右上角「···」按钮，选择"转发给朋友"或"分享到朋友圈"',
      showCancel: false,
      confirmText: '知道了',
      success: () => {
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

  // 格式化日期为 YYYY-MM-DD
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 页面生命周期：分享给好友
  onShareAppMessage() {
    const { avgDuration, restCompletionRate, timeRange, userName } = this.data;
    return {
      title: `${userName} 近${timeRange}天用眼统计：日均${avgDuration}分钟，休息完成率${restCompletionRate}%`,
      path: '/pages/stats/stats'
    };
  },

  // 页面生命周期：分享到朋友圈
  onShareTimeline() {
    const { avgDuration, restCompletionRate, timeRange, userName } = this.data;
    return {
      title: `${userName} 近${timeRange}天用眼统计：日均${avgDuration}分钟，休息完成率${restCompletionRate}% | 青少年近视防控`
    };
  }
});