import Taro from '@tarojs/taro';
import { ApiStatus } from '@/types';

export const formatDate = (dateStr: string, format: string = 'YYYY-MM-DD HH:mm'): string => {
  const date = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const map: Record<string, string> = {
    YYYY: date.getFullYear().toString(),
    MM: pad(date.getMonth() + 1),
    DD: pad(date.getDate()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds())
  };
  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, (matched) => map[matched]);
};

export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export const getStatusText = (status: ApiStatus): string => {
  const map: Record<ApiStatus, string> = {
    success: '成功',
    failed: '失败',
    warning: '告警',
    pending: '巡检中',
    unknown: '未知'
  };
  return map[status] || '未知';
};

export const showToast = (
  title: string,
  icon: 'success' | 'error' | 'loading' | 'none' = 'none',
  duration: number = 2000
) => {
  Taro.showToast({ title, icon, duration });
};

export const copyToClipboard = (text: string) => {
  Taro.setClipboardData({
    data: text,
    success: () => showToast('已复制到剪贴板', 'success')
  });
};

export const generateReportText = (report: {
  date: string;
  totalApis: number;
  successCount: number;
  failedCount: number;
  warningCount: number;
  successRate: number;
  avgDuration: number;
  businessLine: string;
}): string => {
  return `【API巡检日报】
📅 日期: ${report.date}
🏢 业务线: ${report.businessLine}
📊 总体情况:
  - 接口总数: ${report.totalApis}
  - 成功: ${report.successCount}
  - 失败: ${report.failedCount}
  - 告警: ${report.warningCount}
  - 成功率: ${report.successRate}%
  - 平均耗时: ${formatDuration(report.avgDuration)}

请相关负责人关注失败接口，及时处理。`;
};
