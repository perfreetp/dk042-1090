import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { AlertRecord } from '@/types';
import { getStatusText, formatDuration, formatDate } from '@/utils';
import styles from './index.module.scss';

interface AlertItemCardProps {
  alert: AlertRecord;
  apiName?: string;
  groupName?: string;
  onRetry?: (alert: AlertRecord) => void;
  onAddRemark?: (alert: AlertRecord) => void;
  onMarkHandled?: (alert: AlertRecord) => void;
}

const AlertItemCard: React.FC<AlertItemCardProps> = ({ alert, apiName, groupName, onRetry, onAddRemark, onMarkHandled }) => {
  const displayApiName = apiName || alert.apiName;
  const displayGroupName = groupName || alert.groupName;

  const getStatusClass = () => {
    return alert.status === 'failed' ? styles.statusFailed : styles.statusWarning;
  };

  const getBorderClass = () => {
    if (alert.handled) return styles.handledBorder;
    return alert.status === 'failed' ? styles.dangerBorder : styles.warningBorder;
  };

  return (
    <View className={classnames(styles.card, getBorderClass())}>
      <View className={styles.header}>
        <View className={styles.mainInfo}>
          <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx' }}>
            <Text className={styles.name}>{displayApiName}</Text>
            {alert.handled && (
              <View className={styles.handledBadge}>✅ 已处理</View>
            )}
          </View>
          <Text className={styles.group}>
            {displayGroupName} · {alert.apiUrl}
          </Text>
          {alert.handled && alert.handledAt && (
            <Text className={styles.handledTime}>
              处理于 {formatDate(alert.handledAt, 'MM-DD HH:mm')}
            </Text>
          )}
        </View>
        <View className={classnames(styles.statusBadge, getStatusClass())}>
          {alert.isRetrying ? '重试中...' : getStatusText(alert.status)}
        </View>
      </View>

      <View className={styles.errorMsg}>{alert.errorMessage}</View>

      {alert.remark && <View className={styles.remark}>{alert.remark}</View>}

      <View className={styles.meta}>
        <View className={styles.metaItem}>
          <Text>⏱</Text>
          <Text>{formatDuration(alert.duration)}</Text>
        </View>
        <View className={styles.metaItem}>
          <Text>🕐</Text>
          <Text>{formatDate(alert.checkedAt, 'MM-DD HH:mm')}</Text>
        </View>
        {alert.consecutiveFailures >= 2 && (
          <Text className={styles.dangerBadge}>连续 {alert.consecutiveFailures} 次</Text>
        )}
      </View>

      <View className={styles.actions}>
        <Button
          className={classnames(styles.actionBtn, styles.retryBtn)}
          onClick={() => onRetry?.(alert)}
          disabled={alert.isRetrying}
        >
          {alert.isRetrying ? '重试中...' : '重试'}
        </Button>
        <Button
          className={classnames(styles.actionBtn, styles.remarkBtn)}
          onClick={() => onAddRemark?.(alert)}
        >
          {alert.remark ? '修改备注' : '添加备注'}
        </Button>
        {!alert.handled && (
          <Button
            className={classnames(styles.actionBtn, styles.handledBtn)}
            onClick={() => onMarkHandled?.(alert)}
          >
            标记已处理
          </Button>
        )}
      </View>
    </View>
  );
};

export default AlertItemCard;
