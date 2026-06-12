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
import { InspectionResult, ApiStatus } from '@/types';
import styles from './index.module.scss';

const ReportPage: React.FC = () => {
  const { dailyReport, inspectionResults, apiGroups, apiConfigs, runInspection } = useInspection();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterBusiness, setFilterBusiness] = useState<string>('all');

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
    await runInspection();
    showToast('报告已更新', 'success');
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
