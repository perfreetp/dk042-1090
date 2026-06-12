import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useInspection } from '@/store/InspectionContext';
import {
  formatDuration,
  formatDate,
  getStatusText,
  generateReportText,
  copyToClipboard,
  showToast
} from '@/utils';
import { InspectionResult, ApiStatus, AlertType } from '@/types';
import styles from './index.module.scss';

type SummaryTab = 'group' | 'alertType';

const ReportPage: React.FC = () => {
  const { dailyReport, inspectionResults, apiGroups, apiConfigs, runInspection, alertRecords } = useInspection();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterBusiness, setFilterBusiness] = useState<string>('all');
  const [summaryTab, setSummaryTab] = useState<SummaryTab>('group');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const allBusinessLines = useMemo(() => {
    return ['all', ...new Set(apiGroups.map(g => g.businessLine))];
  }, [apiGroups]);

  const getBusinessLineByApiId = useCallback((apiId: string): string => {
    const api = apiConfigs.find(a => a.id === apiId);
    if (!api) return '';
    const group = apiGroups.find(g => g.id === api.groupId);
    return group?.businessLine || '';
  }, [apiConfigs, apiGroups]);

  const filterByBusinessLine = useCallback((results: InspectionResult[]): InspectionResult[] => {
    if (filterBusiness === 'all') return results;
    return results.filter(r => getBusinessLineByApiId(r.apiId) === filterBusiness);
  }, [filterBusiness, getBusinessLineByApiId]);

  const filteredResults = useMemo(() => {
    let results = dailyReport.results.length > 0 ? dailyReport.results : inspectionResults;

    results = filterByBusinessLine(results);

    if (filterStatus !== 'all') {
      results = results.filter(r => r.status === filterStatus);
    }

    return results;
  }, [dailyReport, inspectionResults, filterStatus, filterByBusinessLine]);

  const durationRanking = useMemo(() => {
    let results = dailyReport.results.length > 0 ? dailyReport.results : inspectionResults;
    results = filterByBusinessLine(results);
    return [...results]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);
  }, [dailyReport, inspectionResults, filterByBusinessLine]);

  const handleRefresh = async () => {
    console.log('[ReportPage] Refreshing report');
    showToast('正在生成报告...', 'loading', 1500);
    await runInspection({});
    showToast('报告已更新', 'success');
  };

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const allResults = useMemo(() => {
    return dailyReport.results.length > 0 ? dailyReport.results : inspectionResults;
  }, [dailyReport, inspectionResults]);

  const groupSummaries = useMemo(() => {
    return apiGroups
      .filter(group => {
        if (filterBusiness === 'all') return true;
        return group.businessLine === filterBusiness;
      })
      .map(group => {
        const groupApiIds = apiConfigs.filter(a => a.groupId === group.id).map(a => a.id);
        const groupResults = allResults.filter(r => groupApiIds.includes(r.apiId));

        if (groupResults.length === 0) {
          return {
            ...group,
            total: 0,
            success: 0,
            failed: 0,
            warning: 0,
            successRate: 0,
            avgDuration: 0,
            failedApis: [] as InspectionResult[],
            recentAlerts: [] as typeof alertRecords
          };
        }

        const success = groupResults.filter(r => r.status === 'success').length;
        const failed = groupResults.filter(r => r.status === 'failed').length;
        const warning = groupResults.filter(r => r.status === 'warning').length;
        const total = groupResults.length;
        const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
        const avgDuration = total > 0 ? Math.round(groupResults.reduce((s, r) => s + r.duration, 0) / total) : 0;
        const failedApis = groupResults
          .filter(r => r.status === 'failed' || r.status === 'warning')
          .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime());

        const recentAlerts = alertRecords
          .filter(a => groupApiIds.includes(a.apiId))
          .sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime())
          .slice(0, 3);

        return {
          ...group,
          total,
          success,
          failed,
          warning,
          successRate,
          avgDuration,
          failedApis,
          recentAlerts
        };
      });
  }, [apiGroups, apiConfigs, allResults, alertRecords, filterBusiness]);

  const alertTypeSummaries = useMemo(() => {
    const filteredAlerts = alertRecords.filter(alert => {
      if (filterBusiness === 'all') return true;
      const api = apiConfigs.find(a => a.id === alert.apiId);
      if (!api) return false;
      const group = apiGroups.find(g => g.id === api.groupId);
      return group?.businessLine === filterBusiness;
    });

    const typeMap: Record<string, number> = {};
    filteredAlerts.forEach(alert => {
      const type = alert.type || 'unknown';
      typeMap[type] = (typeMap[type] || 0) + 1;
    });

    const alertTypeLabel: Record<AlertType, string> = {
      status_code: '状态码异常',
      timeout: '请求超时',
      field_mismatch: '字段校验失败',
      network_error: '网络错误',
      consecutive_failures: '连续失败'
    };

    return (Object.keys(typeMap) as AlertType[]).map(type => ({
      type,
      label: alertTypeLabel[type] || type,
      count: typeMap[type],
      recentAlerts: filteredAlerts
        .filter(a => a.type === type)
        .sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime())
        .slice(0, 5)
    }));
  }, [alertRecords, apiConfigs, apiGroups, filterBusiness]);

  const getAlertTypeLabel = (type: AlertType) => {
    const map: Record<AlertType, string> = {
      status_code: '状态码异常',
      timeout: '请求超时',
      field_mismatch: '字段校验失败',
      network_error: '网络错误',
      consecutive_failures: '连续失败'
    };
    return map[type] || type;
  };

  const handleShare = async () => {
    const reportText = generateReportText({
      date: dailyReport.date,
      totalApis: dailyReport.totalApis,
      successCount: dailyReport.successCount,
      failedCount: dailyReport.failedCount,
      warningCount: dailyReport.warningCount,
      successRate: dailyReport.successRate,
      avgDuration: dailyReport.avgDuration,
      businessLine: dailyReport.businessLine
    });

    try {
      copyToClipboard(reportText);
      showToast('报告已复制，可粘贴到群聊', 'success');
    } catch (e) {
      console.error('[ReportPage] Share failed:', e);
      showToast('分享失败', 'error');
    }
  };

  const getResultClass = (status: ApiStatus) => {
    switch (status) {
      case 'success': return styles.resultSuccess;
      case 'failed': return styles.resultFailed;
      case 'warning': return styles.resultWarning;
      default: return '';
    }
  };

  const getStatusClass = (status: ApiStatus) => {
    switch (status) {
      case 'success': return styles.statusSuccess;
      case 'failed': return styles.statusFailed;
      case 'warning': return styles.statusWarning;
      default: return '';
    }
  };

  const getRankingClass = (index: number) => {
    switch (index) {
      case 0: return styles.rankingTop1;
      case 1: return styles.rankingTop2;
      case 2: return styles.rankingTop3;
      default: return '';
    }
  };

  return (
    <ScrollView className={styles.page} scrollY>
      <View className="pageContainer">
        <View className={styles.reportHeader}>
          <Text className={styles.reportTitle}>今日巡检报告</Text>
          <Text className={styles.reportDate}>
            {formatDate(dailyReport.generatedAt, 'YYYY年MM月DD日 HH:mm')} 生成
          </Text>
          <Text className={styles.reportBusiness}>{dailyReport.businessLine}</Text>

          <View className={styles.mainStat}>
            <Text className={styles.mainStatValue}>{dailyReport.successRate}</Text>
            <Text className={styles.mainStatUnit}>%</Text>
          </View>
          <Text className={styles.mainStatLabel}>整体成功率</Text>

          <View className={styles.statsGrid}>
            <View className={styles.statItem}>
              <Text className={styles.statValue}>{dailyReport.totalApis}</Text>
              <Text className={styles.statLabel}>总接口</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statValue}>{dailyReport.successCount}</Text>
              <Text className={styles.statLabel}>成功</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statValue}>{dailyReport.failedCount}</Text>
              <Text className={styles.statLabel}>失败</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statValue}>{formatDuration(dailyReport.avgDuration)}</Text>
              <Text className={styles.statLabel}>平均耗时</Text>
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <Text className={styles.sectionTitle}>🏢 业务线筛选</Text>
          <ScrollView
            className={styles.businessFilter}
            scrollX
            enhanced
            showScrollbar={false}
          >
            {allBusinessLines.map(line => (
              <View
                key={line}
                className={classnames(styles.businessItem, {
                  [styles.businessActive]: filterBusiness === line
                })}
                onClick={() => setFilterBusiness(line)}
              >
                {line === 'all' ? '全部业务线' : line}
              </View>
            ))}
          </ScrollView>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>📊 汇总视图</Text>
            <View className={styles.filterTabs}>
              <View
                className={classnames(styles.filterTab, {
                  [styles.filterTabActive]: summaryTab === 'group'
                })}
                onClick={() => setSummaryTab('group')}
              >
                按接口分组
              </View>
              <View
                className={classnames(styles.filterTab, {
                  [styles.filterTabActive]: summaryTab === 'alertType'
                })}
                onClick={() => setSummaryTab('alertType')}
              >
                按告警类型
              </View>
            </View>
          </View>

          {summaryTab === 'group' && (
            <View>
              {groupSummaries.map(group => {
                const isExpanded = expandedGroups.has(group.id);
                const rateColor = group.successRate >= 95 ? '#00b42a' : group.successRate >= 80 ? '#ff7d00' : '#f53f3f';
                return (
                  <View key={group.id} className={styles.groupSummaryCard}>
                    <View className={styles.groupSummaryHeader} onClick={() => toggleGroupExpand(group.id)}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text className={styles.groupSummaryName}>{group.name}</Text>
                        <Text className={styles.groupSummaryBusiness}>{group.businessLine}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text className={styles.groupSummaryRate} style={{ color: rateColor }}>
                          {group.total > 0 ? `${group.successRate}%` : '—'}
                        </Text>
                        <Text className={styles.groupSummaryLabel}>成功率</Text>
                      </View>
                    </View>

                    <View className={styles.groupSummaryStats}>
                      <View className={styles.groupSummaryStat}>
                        <Text className={styles.groupSummaryStatValue}>{group.total}</Text>
                        <Text className={styles.groupSummaryStatLabel}>接口数</Text>
                      </View>
                      <View className={styles.groupSummaryStat}>
                        <Text className={styles.groupSummaryStatValue} style={{ color: '#00b42a' }}>{group.success}</Text>
                        <Text className={styles.groupSummaryStatLabel}>成功</Text>
                      </View>
                      <View className={styles.groupSummaryStat}>
                        <Text className={styles.groupSummaryStatValue} style={{ color: '#f53f3f' }}>{group.failed + group.warning}</Text>
                        <Text className={styles.groupSummaryStatLabel}>异常</Text>
                      </View>
                      <View className={styles.groupSummaryStat}>
                        <Text className={styles.groupSummaryStatValue}>{group.total > 0 ? formatDuration(group.avgDuration) : '—'}</Text>
                        <Text className={styles.groupSummaryStatLabel}>平均耗时</Text>
                      </View>
                    </View>

                    {isExpanded && group.total > 0 && (
                      <View className={styles.groupSummaryDetail}>
                        {group.failedApis.length > 0 && (
                          <View>
                            <Text className={styles.groupSummaryDetailTitle}>🚨 失败/告警接口</Text>
                            {group.failedApis.map(api => (
                              <View
                                key={api.id}
                                className={styles.groupSummaryApiItem}
                                onClick={() => Taro.navigateTo({ url: `/pages/debug/index?id=${api.apiId}` })}
                              >
                                <View style={{ flex: 1, minWidth: 0 }}>
                                  <Text className={styles.groupSummaryApiName}>{api.apiName}</Text>
                                  <Text className={styles.groupSummaryApiUrl}>{api.apiUrl}</Text>
                                </View>
                                <View style={{ textAlign: 'right' }}>
                                  <View className={classnames(styles.resultStatus, getStatusClass(api.status))} style={{ marginBottom: '6rpx' }}>
                                    {getStatusText(api.status)}
                                  </View>
                                  <Text style={{ fontSize: '22rpx', color: '#86909c' }}>{formatDuration(api.duration)}</Text>
                                </View>
                              </View>
                            ))}
                          </View>
                        )}

                        {group.recentAlerts.length > 0 && (
                          <View style={{ marginTop: '20rpx' }}>
                            <Text className={styles.groupSummaryDetailTitle}>📌 最近异常</Text>
                            {group.recentAlerts.map(alert => (
                              <View key={alert.id} className={styles.groupSummaryAlertItem}>
                                <View className={styles.groupSummaryAlertBadge}>
                                  {getAlertTypeLabel(alert.type)}
                                </View>
                                <Text className={styles.groupSummaryAlertMsg}>{alert.message}</Text>
                                <Text className={styles.groupSummaryAlertTime}>
                                  {formatDate(alert.triggeredAt, 'HH:mm')}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {group.failedApis.length === 0 && group.recentAlerts.length === 0 && (
                          <View className={styles.groupSummaryAllGood}>
                            ✅ 该分组所有接口运行正常
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {summaryTab === 'alertType' && (
            <View>
              {alertTypeSummaries.length > 0 ? (
                alertTypeSummaries.map(item => {
                  const isExpanded = expandedGroups.has(`alert_${item.type}`);
                  return (
                    <View key={item.type} className={styles.groupSummaryCard}>
                      <View
                        className={styles.groupSummaryHeader}
                        onClick={() => {
                          setExpandedGroups(prev => {
                            const next = new Set(prev);
                            const key = `alert_${item.type}`;
                            if (next.has(key)) next.delete(key);
                            else next.add(key);
                            return next;
                          });
                        }}
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text className={styles.groupSummaryName}>⚠️ {item.label}</Text>
                          <Text className={styles.groupSummaryBusiness}>告警类型统计</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text className={styles.groupSummaryRate} style={{ color: '#f53f3f' }}>{item.count}</Text>
                          <Text className={styles.groupSummaryLabel}>次</Text>
                        </View>
                      </View>
                      {isExpanded && (
                        <View className={styles.groupSummaryDetail}>
                          {item.recentAlerts.map(alert => (
                            <View
                              key={alert.id}
                              className={styles.groupSummaryAlertItem}
                              onClick={() => Taro.navigateTo({ url: `/pages/debug/index?id=${alert.apiId}` })}
                            >
                              <Text className={styles.groupSummaryAlertMsg}>{alert.message}</Text>
                              <Text className={styles.groupSummaryAlertTime}>
                                {formatDate(alert.triggeredAt, 'MM-DD HH:mm')}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <View className={styles.emptyState}>
                  <Text className={styles.emptyIcon}>🎉</Text>
                  <Text className={styles.emptyTitle}>暂无告警记录</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>⏱ 耗时排名 TOP5</Text>
          </View>
          <View className={styles.durationRanking}>
            {durationRanking.map((result, index) => (
              <View key={result.id} className={styles.rankingItem}>
                <View className={classnames(styles.rankingIndex, getRankingClass(index))}>
                  {index + 1}
                </View>
                <Text className={styles.rankingName}>{result.apiName}</Text>
                <Text className={styles.rankingDuration}>{formatDuration(result.duration)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>📋 巡检详情</Text>
            <View className={styles.filterTabs}>
              <View
                className={classnames(styles.filterTab, {
                  [styles.filterTabActive]: filterStatus === 'all'
                })}
                onClick={() => setFilterStatus('all')}
              >
                全部
              </View>
              <View
                className={classnames(styles.filterTab, {
                  [styles.filterTabActive]: filterStatus === 'failed'
                })}
                onClick={() => setFilterStatus('failed')}
              >
                失败
              </View>
              <View
                className={classnames(styles.filterTab, {
                  [styles.filterTabActive]: filterStatus === 'warning'
                })}
                onClick={() => setFilterStatus('warning')}
              >
                告警
              </View>
              <View
                className={classnames(styles.filterTab, {
                  [styles.filterTabActive]: filterStatus === 'success'
                })}
                onClick={() => setFilterStatus('success')}
              >
                成功
              </View>
            </View>
          </View>

          {filteredResults.length > 0 ? (
            filteredResults.map((result: InspectionResult) => (
              <View
                key={result.id}
                className={classnames(styles.resultCard, getResultClass(result.status))}
                onClick={() => Taro.navigateTo({ url: `/pages/debug/index?id=${result.apiId}` })}
              >
                <View className={styles.resultHeader}>
                  <View className={styles.resultInfo}>
                    <Text className={styles.resultName}>{result.apiName}</Text>
                    <Text className={styles.resultUrl}>{result.apiUrl}</Text>
                  </View>
                  <View className={classnames(styles.resultStatus, getStatusClass(result.status))}>
                    {getStatusText(result.status)}
                  </View>
                </View>

                <View className={styles.resultMeta}>
                  <View className={styles.resultMetaItem}>
                    <Text>⏱</Text>
                    <Text>{formatDuration(result.duration)}</Text>
                  </View>
                  <View className={styles.resultMetaItem}>
                    <Text>🕐</Text>
                    <Text>{formatDate(result.checkedAt, 'HH:mm:ss')}</Text>
                  </View>
                  <View className={styles.resultMetaItem}>
                    <Text>HTTP</Text>
                    <Text>
                      {result.actualStatusCode}
                      {result.actualStatusCode !== result.statusCode && ` (期望 ${result.statusCode})`}
                    </Text>
                  </View>
                </View>

                {result.errorMessage && (
                  <View className={styles.resultError}>{result.errorMessage}</View>
                )}

                {result.remark && (
                  <View className={styles.resultRemark}>{result.remark}</View>
                )}
              </View>
            ))
          ) : (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>📭</Text>
              <Text className={styles.emptyTitle}>暂无匹配的巡检记录</Text>
              <Text className={styles.emptyDesc}>请尝试其他筛选条件</Text>
            </View>
          )}
        </View>
      </View>

      <View className={styles.bottomBar}>
        <View className={classnames(styles.btn, styles.btnSecondary)} onClick={handleRefresh}>
          刷新报告
        </View>
        <View className={classnames(styles.btn, styles.btnPrimary)} onClick={handleShare}>
          分享报告
        </View>
      </View>
    </ScrollView>
  );
};

export default ReportPage;
