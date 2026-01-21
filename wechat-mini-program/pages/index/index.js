// pages/index/index.js
Page({
  data: {
  },
  onLoad: function (options) {
    console.log('WebView 加载中...');
  },
  onShareAppMessage: function (options) {
    // 允许用户通过小程序右上角转发给朋友
    // web-view 组件的网页 URL 会自动包含在分享中
    return {
      title: '海南丝滑离岛 - 查验红绿灯与AI助手',
      path: '/pages/index/index'
    }
  }
})