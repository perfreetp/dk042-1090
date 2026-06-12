import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Textarea } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import { useInspection } from '@/store/InspectionContext';
import AlertItemCard from '@/components/AlertItemCard';
import { showToast } from '@/utils';
import { AlertRecord } from '@/types';
import styles from './index.module.scss';

const AlertsPage: React.FC = () => {
  const { alertRecords, retryAlert, updateAlertRemark, runInspection } = useInspection();
  const [filterType, setFilterType] = useState<string>('all');
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<AlertRecord | null>(null);
  const [remarkText, setRemarkText] = useState('');

  usePullDownRefresh(() => {
    Taro.stopPullDownRefresh();
  });

  const handleRetry = async (alert: AlertRecord) => {
    console.log('[AlertsPage] Retrying alert:', alert.id);
    showToast('正在重试...', 'loading', 1500);
    await retryAlert(alert.id);
    showToast('重试完成', 'success');
  };

  const handleAddRemark = (alert: AlertRecord) => {
    setCurrentAlert(alert);
    setRemarkText(alert.remark || '');
    setShowRemarkModal(true);
  };

  const handleConfirmRemark = () => {
    if (currentAlert) {
      console.log('[AlertsPage] Adding remark for alert:', currentAlert.id);
      updateAlertRemark(currentAlert.id, remarkText);
      showToast('备注已保存', 'success');
    }
    setShowRemarkModal(false);
    setCurrentAlert(null);
    setRemarkText('');
  };

  const handleCancelRemark = () => {
    setShowRemarkModal(false);
    setCurrentAlert(null);
    setRemarkText('');
  };

  const handleRetryAll = async () => {
    const failedAlerts = alertRecords.filter(a => a.status === 'failed');
    if (failedAlerts.length === 0) {
      showToast('暂无失败告警');
      return;
    }
    console.log('[AlertsPage] Retrying all failed alerts');
    showToast(`正在重试 ${failedAlerts.length} 个告警...`, 'loading', 2000);
    for (const alert of failedAlerts) {
      await retryAlert(alert.id);
    }
    showToast('全部重试完成', 'success');
  };

  const filteredAlerts = useMemo(() => {
    if (filterType === 'all') return alertRecords;
    if (filterType === 'failed') return alertRecords.filter(a => a.status === 'failed');
    if (filterType === 'warning') return alertRecords.filter(a => a.status === 'warning');
    if (filterType === 'consecutive') return alertRecords.filter(a => a.consecutiveFailures >= 2);
    return alertRecords;
  }, [alertRecords, filterType]);

  const stats = useMemo(() => {
    const failed = alertRecords.filter(a => a.status === 'failed').length;
    const warning = alertRecords.filter(a => a.status === 'warning').length;
    const consecutive = alertRecords.filter(a => a.consecutiveFailures >= 3).length;
    return { failed, warning, consecutive };
  }, [alertRecords]);

  const highRiskAlerts = useMemo(() => {
    return filteredAlerts.filter(a => a.consecutiveFailures >= 3);
  }, [filteredAlerts]);

  const normalAlerts = useMemo(() => {
    return filteredAlerts.filter(a => a.consecutiveFailures < 3);
  }, [filteredAlerts]);

  return (
    <ScrollView className={styles.page} scrollY>
      <View className="pageContainer">
        <View className={styles.header}>
          <Text className={styles.title}>告警记录</Text>
          <Text className={styles.subtitle}>
            共 {alertRecords.length} 条告警 · 点击重试或添加备注
          </Text>
        </View>

        {stats.consecutive > 0 && (
          <View className={styles.dangerHighlight}>
            <Text className={styles.dangerIcon}>🚨</Text>
            <Text className={styles.dangerText}>
              有 {stats.consecutive} 个接口连续失败，请立即处理
            </Text>
            <View
              style={{
                padding: '12rpx 24rpx',
                background: '#ffffff',
                borderRadius: '32rpx',
                fontSize: '24rpx',
                color: '#f53f3f',
                fontWeight: 600
              }}
              onClick={handleRetryAll}
            >
              全部重试
            </View>
          </View>
        )}

        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.failed}</Text>
            <Text className={styles.statLabel}>失败告警</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={classnames(styles.statValue, styles.statValueWarn)}>{stats.warning}</Text>
            <Text className={styles.statLabel}>性能告警</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={classnames(styles.statValue, styles.statValueInfo)}>{stats.consecutive}</Text>
            <Text className={styles.statLabel}>连续失败</Text>
          </View>
        </View>

        <ScrollView
          className={styles.filterBar}
          scrollX
          enhanced
          showScrollbar={false}
        >
          <View
            className={classnames(styles.filterItem, {
              [styles.filterActive]: filterType === 'all'
            })}
            onClick={() => setFilterType('all')}
          >
            全部 ({alertRecords.length})
          </View>
          <View
            className={classnames(styles.filterItem, {
              [styles.filterActive]: filterType === 'failed'
            })}
            onClick={() => setFilterType('failed')}
          >
            失败 ({stats.failed})
          </View>
          <View
            className={classnames(styles.filterItem, {
              [styles.filterWarnActive]: filterType === 'warning'
            })}
            onClick={() => setFilterType('warning')}
          >
            告警 ({stats.warning})
          </View>
          <View
            className={classnames(styles.filterItem, {
              [styles.filterActive]: filterType === 'consecutive'
            })}
            onClick={() => setFilterType('consecutive')}
          >
            连续失败 ({stats.consecutive})
          </View>
        </ScrollView>

        {filteredAlerts.length > 0 ? (
          <View>
            {highRiskAlerts.length > 0 && (
              <View style={{ marginBottom: '32rpx' }}>
                <Text className={styles.sectionTitle}>高优先级（连续失败≥3次）</Text>
                {highRiskAlerts.map(alert => (
                  <AlertItemCard
                    key={alert.id}
                    alert={alert}
                    onRetry={handleRetry}
                    onAddRemark={handleAddRemark}
                  />
                ))}
              </View>
            )}

            {normalAlerts.length > 0 && (
              <View>
                <Text className={styles.sectionTitle}>普通告警</Text>
                {normalAlerts.map(alert => (
                  <AlertItemCard
                    key={alert.id}
                    alert={alert}
                    onRetry={handleRetry}
                    onAddRemark={handleAddRemark}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>✅</Text>
            <Text className={styles.emptyTitle}>暂无告警记录</Text>
            <Text className={styles.emptyDesc}>所有接口运行正常，继续保持！</Text>
          </View>
        )}
      </View>

      {showRemarkModal && (
        <View className={styles.modalMask} onClick={handleCancelRemark}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation?.()}>
            <Text className={styles.modalTitle}>添加处理备注</Text>
            <Textarea
              className={styles.modalTextarea}
              placeholder="请输入处理备注，如：正在联系DBA排查..."
              value={remarkText}
              onInput={(e) => setRemarkText(e.detail.value)}
              maxlength={200}
            />
            <View className={styles.modalActions}>
              <View className={classnames(styles.modalBtn, styles.modalCancel)} onClick={handleCancelRemark}>
                取消
              </View>
              <View className={classnames(styles.modalBtn, styles.modalConfirm)} onClick={handleConfirmRemark}>
                保存
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default AlertsPage;
