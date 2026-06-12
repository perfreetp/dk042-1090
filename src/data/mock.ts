import { ApiConfig, ApiGroup, InspectionResult, InspectionReport, AlertRecord } from '@/types';

export const mockApiGroups: ApiGroup[] = [
  {
    id: 'group-1',
    name: '用户中心',
    description: '用户相关接口',
    businessLine: '用户服务',
    apiCount: 5,
    successRate: 95.2
  },
  {
    id: 'group-2',
    name: '订单系统',
    description: '订单与支付相关',
    businessLine: '交易服务',
    apiCount: 8,
    successRate: 88.5
  },
  {
    id: 'group-3',
    name: '商品中心',
    description: '商品信息管理',
    businessLine: '商品服务',
    apiCount: 6,
    successRate: 98.3
  },
  {
    id: 'group-4',
    name: '数据统计',
    description: 'BI数据接口',
    businessLine: '数据服务',
    apiCount: 4,
    successRate: 91.7
  },
  {
    id: 'group-5',
    name: '消息推送',
    description: '通知与消息服务',
    businessLine: '消息服务',
    apiCount: 3,
    successRate: 85.0
  }
];

export const mockApiConfigs: ApiConfig[] = [
  {
    id: 'api-1',
    name: '获取用户信息',
    url: 'https://api.example.com/user/info',
    method: 'GET',
    groupId: 'group-1',
    groupName: '用户中心',
    description: '获取当前登录用户基本信息',
    expectedStatusCode: 200,
    params: [
      { key: 'userId', value: '12345', type: 'query' }
    ],
    expectedFields: [
      { field: 'code', expectedValue: '0', operator: 'equals' },
      { field: 'data.name', expectedValue: '', operator: 'notEmpty' }
    ],
    createdAt: '2024-01-10T08:00:00Z',
    lastCheckedAt: '2024-06-12T09:30:00Z',
    lastStatus: 'success',
    lastDuration: 120,
    consecutiveFailures: 0
  },
  {
    id: 'api-2',
    name: '用户登录',
    url: 'https://api.example.com/user/login',
    method: 'POST',
    groupId: 'group-1',
    groupName: '用户中心',
    description: '用户账号密码登录',
    expectedStatusCode: 200,
    params: [
      { key: 'username', value: 'test', type: 'body' },
      { key: 'password', value: '123456', type: 'body' }
    ],
    expectedFields: [
      { field: 'code', expectedValue: '0', operator: 'equals' }
    ],
    createdAt: '2024-01-10T08:05:00Z',
    lastCheckedAt: '2024-06-12T09:28:00Z',
    lastStatus: 'success',
    lastDuration: 200,
    consecutiveFailures: 0
  },
  {
    id: 'api-3',
    name: '创建订单',
    url: 'https://api.example.com/order/create',
    method: 'POST',
    groupId: 'group-2',
    groupName: '订单系统',
    description: '创建新订单',
    expectedStatusCode: 201,
    params: [
      { key: 'productId', value: 'P001', type: 'body' },
      { key: 'quantity', value: '1', type: 'body' }
    ],
    expectedFields: [
      { field: 'code', expectedValue: '0', operator: 'equals' },
      { field: 'data.orderId', expectedValue: '', operator: 'notEmpty' }
    ],
    createdAt: '2024-01-12T10:00:00Z',
    lastCheckedAt: '2024-06-12T09:25:00Z',
    lastStatus: 'failed',
    lastDuration: 3500,
    consecutiveFailures: 3
  },
  {
    id: 'api-4',
    name: '查询订单列表',
    url: 'https://api.example.com/order/list',
    method: 'GET',
    groupId: 'group-2',
    groupName: '订单系统',
    description: '分页查询用户订单',
    expectedStatusCode: 200,
    params: [
      { key: 'page', value: '1', type: 'query' },
      { key: 'pageSize', value: '20', type: 'query' }
    ],
    expectedFields: [
      { field: 'code', expectedValue: '0', operator: 'equals' }
    ],
    createdAt: '2024-01-12T10:05:00Z',
    lastCheckedAt: '2024-06-12T09:20:00Z',
    lastStatus: 'success',
    lastDuration: 180,
    consecutiveFailures: 0
  },
  {
    id: 'api-5',
    name: '获取商品详情',
    url: 'https://api.example.com/product/detail',
    method: 'GET',
    groupId: 'group-3',
    groupName: '商品中心',
    description: '根据ID获取商品详情',
    expectedStatusCode: 200,
    params: [
      { key: 'productId', value: 'P001', type: 'query' }
    ],
    expectedFields: [
      { field: 'code', expectedValue: '0', operator: 'equals' },
      { field: 'data.title', expectedValue: '', operator: 'notEmpty' }
    ],
    createdAt: '2024-01-15T14:00:00Z',
    lastCheckedAt: '2024-06-12T09:15:00Z',
    lastStatus: 'success',
    lastDuration: 95,
    consecutiveFailures: 0
  },
  {
    id: 'api-6',
    name: '支付回调',
    url: 'https://api.example.com/payment/callback',
    method: 'POST',
    groupId: 'group-2',
    groupName: '订单系统',
    description: '支付结果回调处理',
    expectedStatusCode: 200,
    expectedFields: [
      { field: 'code', expectedValue: '0', operator: 'equals' }
    ],
    createdAt: '2024-01-12T11:00:00Z',
    lastCheckedAt: '2024-06-12T09:10:00Z',
    lastStatus: 'warning',
    lastDuration: 2800,
    consecutiveFailures: 1
  },
  {
    id: 'api-7',
    name: '发送短信通知',
    url: 'https://api.example.com/message/sms',
    method: 'POST',
    groupId: 'group-5',
    groupName: '消息推送',
    description: '发送短信通知消息',
    expectedStatusCode: 200,
    expectedFields: [
      { field: 'code', expectedValue: '0', operator: 'equals' }
    ],
    createdAt: '2024-01-20T09:00:00Z',
    lastCheckedAt: '2024-06-12T09:05:00Z',
    lastStatus: 'failed',
    lastDuration: 5000,
    consecutiveFailures: 5
  },
  {
    id: 'api-8',
    name: '销售统计报表',
    url: 'https://api.example.com/stats/sales',
    method: 'GET',
    groupId: 'group-4',
    groupName: '数据统计',
    description: '获取日销售统计数据',
    expectedStatusCode: 200,
    expectedFields: [
      { field: 'code', expectedValue: '0', operator: 'equals' }
    ],
    createdAt: '2024-02-01T10:00:00Z',
    lastCheckedAt: '2024-06-12T09:00:00Z',
    lastStatus: 'success',
    lastDuration: 450,
    consecutiveFailures: 0
  }
];

export const mockInspectionResults: InspectionResult[] = [
  {
    id: 'result-1',
    apiId: 'api-1',
    apiName: '获取用户信息',
    apiUrl: 'https://api.example.com/user/info',
    statusCode: 200,
    actualStatusCode: 200,
    duration: 120,
    status: 'success',
    checkedAt: '2024-06-12T09:30:00Z',
    fieldValidations: [
      { field: 'code', passed: true, expected: '0', actual: '0' },
      { field: 'data.name', passed: true, expected: 'not empty', actual: '张三' }
    ]
  },
  {
    id: 'result-2',
    apiId: 'api-3',
    apiName: '创建订单',
    apiUrl: 'https://api.example.com/order/create',
    statusCode: 201,
    actualStatusCode: 500,
    duration: 3500,
    status: 'failed',
    errorMessage: 'Internal Server Error: 数据库连接超时',
    checkedAt: '2024-06-12T09:25:00Z'
  },
  {
    id: 'result-3',
    apiId: 'api-7',
    apiName: '发送短信通知',
    apiUrl: 'https://api.example.com/message/sms',
    statusCode: 200,
    actualStatusCode: 200,
    duration: 5000,
    status: 'warning',
    checkedAt: '2024-06-12T09:05:00Z',
    remark: '响应较慢，需检查短信网关状态',
    fieldValidations: [
      { field: 'code', passed: true, expected: '0', actual: '0' }
    ]
  }
];

export const mockAlertRecords: AlertRecord[] = [
  {
    id: 'alert-1',
    apiId: 'api-7',
    apiName: '发送短信通知',
    apiUrl: 'https://api.example.com/message/sms',
    groupName: '消息推送',
    status: 'failed',
    errorMessage: '短信服务超时，请检查网关连通性',
    duration: 5000,
    checkedAt: '2024-06-12T09:05:00Z',
    consecutiveFailures: 5
  },
  {
    id: 'alert-2',
    apiId: 'api-3',
    apiName: '创建订单',
    apiUrl: 'https://api.example.com/order/create',
    groupName: '订单系统',
    status: 'failed',
    errorMessage: 'Internal Server Error: 数据库连接超时',
    duration: 3500,
    checkedAt: '2024-06-12T09:25:00Z',
    remark: 'DBA正在处理，预计10分钟后恢复',
    consecutiveFailures: 3
  },
  {
    id: 'alert-3',
    apiId: 'api-6',
    apiName: '支付回调',
    apiUrl: 'https://api.example.com/payment/callback',
    groupName: '订单系统',
    status: 'warning',
    errorMessage: '响应时间超过阈值(2800ms)',
    duration: 2800,
    checkedAt: '2024-06-12T09:10:00Z',
    consecutiveFailures: 1
  }
];

export const mockDailyReport: InspectionReport = {
  id: 'report-20240612',
  date: '2024-06-12',
  totalApis: 26,
  successCount: 22,
  failedCount: 3,
  warningCount: 1,
  successRate: 84.6,
  avgDuration: 672,
  businessLine: '全部业务线',
  results: mockInspectionResults,
  generatedAt: '2024-06-12T09:30:00Z'
};
