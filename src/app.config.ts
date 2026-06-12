export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/groups/index',
    'pages/alerts/index',
    'pages/debug/index',
    'pages/report/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#165dff',
    navigationBarTitleText: 'API巡检',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#86909c',
    selectedColor: '#165dff',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页'
      },
      {
        pagePath: 'pages/groups/index',
        text: '接口'
      },
      {
        pagePath: 'pages/alerts/index',
        text: '告警'
      }
    ]
  }
})
