import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro';
import { useInspection } from '@/store/InspectionContext';
import GradientHeader from '@/components/GradientHeader';
import StatCard from '@/components/StatCard';
import ApiItemCard from '@/components/ApiItemCard';
import { formatDuration, showToast } from '@/utils';
import { ApiConfig } from '@/types';
import styles from './index.module.scss';

const HomePage: React.FC = () => {
  const {
    apiGroups,
    apiConfigs,
    dailyReport,
    alertRecords,
    inspecting,
    runInspection
  } = useInspection();

  usePullDownRefresh(() => {
    handleRefresh();
  });

  useDidShow(() => {
    console.log('[HomePage] Page shown');
  });

  const handleRefresh = async () => {
    console.log('[HomePage] Pull down refresh');
    Taro.stopPullDownRefresh();
  };

  const handleInspectAll = async () => {
    if (inspecting) {
      showToast('正在巡检中...');
      return;
    }
    console.log('[HomePage] Starting full inspection');
    showToast('开始巡检...', 'loading', 1000);
    await runInspection({});
    showToast('巡检完成', 'success');
  };

  const handleInspectApi = async (api: ApiConfig) => {
    console.log('[HomePage] Inspecting API:', api.id);
    await runInspection({ apiId: api.id });
    showToast(`${api.name} 巡检完成`, 'success');
  };

  const handleViewReport = () => {
    Taro.navigateTo({ url: '/pages/report/index' });
  };

  const handleApiClick = (api: ApiConfig) => {
    Taro.navigateTo({ url: `/pages/debug/index?id=${api.id}` });
  };

  const recentFailedApis = useMemo(() => {
    return apiConfigs
      .filter(api => api.lastStatus === 'failed' || api.lastStatus === 'warning')
      .sort((a, b) => (b.consecutiveFailures - a.consecutiveFailures))
      .slice(0, 3);
  }, [apiConfigs]);

  const stats = useMemo(() => {
    const success = apiConfigs.filter(a => a.lastStatus === 'success').length;
    const failed = apiConfigs.filter(a => a.lastStatus === 'failed').length;
    const warning = apiConfigs.filter(a => a.lastStatus === 'warning').length;
    const avgDuration = Math.round(
      apiConfigs.filter(a => a.lastDuration).reduce((s, a) => s + (a.lastDuration || 0), 0) /
      Math.max(1, apiConfigs.filter(a => a.lastDuration).length)
    );
    return { success, failed, warning, avgDuration };
  }, [apiConfigs]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <ScrollView className={styles.page} scrollY>
      <View className="pageContainer">
        <GradientHeader
          title="API 巡检平台"
          subtitle={`${today} · 值班巡检中`}
          showActions
          onInspectAll={handleInspectAll}
          onViewReport={handleViewReport}
        />

        <View className={styles.successRateCard}>
          <View className={styles.rateHeader}>
            <Text className={styles.rateValue}>{dailyReport.successRate}%</Text>
            <Text className={styles.rateUnit}>成功率</Text>
          </View>
          <Text className={styles.rateLabel}>今日整体服务可用率</Text>
          <View className={styles.rateDetails}>
            <View className={styles.rateDetail}>
              <Text className={styles.rateDetailValue}>{dailyReport.totalApis}</Text>
              <Text className={styles.rateDetailLabel}>接口总数</Text>
            </View>
            <View className={styles.rateDetail}>
              <Text className={styles.rateDetailValue}>{dailyReport.successCount}</Text>
              <Text className={styles.rateDetailLabel}>成功</Text>
            </View>
            <View className={styles.rateDetail}>
              <Text className={styles.rateDetailValue}>{dailyReport.failedCount}</Text>
              <Text className={styles.rateDetailLabel}>失败</Text>
            </View>
            <View className={styles.rateDetail}>
              <Text className={styles.rateDetailValue}>{formatDuration(dailyReport.avgDuration)}</Text>
              <Text className={styles.rateDetailLabel}>平均耗时</Text>
            </View>
          </View>
        </View>

        <View className={styles.statGrid}>
          <StatCard value={stats.success} label="成功接口" type="success" icon="✓" />
          <StatCard value={stats.failed} label="失败接口" type="error" icon="✕" />
          <StatCard value={stats.warning} label="告警接口" type="warning" icon="!" />
          <StatCard value={alertRecords.length} label="未处理告警" type="info" icon="⚠" />
        </View>

        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>业务线概览</Text>
          </View>
          <ScrollView
            className={styles.businessLineScroll}
            scrollX
            enhanced
            showScrollbar={false}
          >
            {apiGroups.map(group => (
              <View key={group.id} className={styles.businessLineItem}>
                <Text className={styles.businessLineName}>{group.name}</Text>
                <Text className={styles.businessLineRate}>
                  {group.successRate?.toFixed(1)}%
                </Text>
                <Text className={styles.businessLineCount}>{group.apiCount} 个接口</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>异常接口</Text>
            <Text className={styles.sectionMore} onClick={() => Taro.switchTab({ url: '/pages/alerts/index' })}>
              查看全部 ›
            </Text>
          </View>
          {recentFailedApis.length > 0 ? (
            recentFailedApis.map(api => (
              <ApiItemCard
                key={api.id}
                api={api}
                onInspect={handleInspectApi}
                onClick={handleApiClick}
              />
            ))
          ) : (
            <View className={styles.emptyState}>
              <Text className={styles.emptyText}>✨ 暂无异常接口，服务状态良好</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default HomePage;
