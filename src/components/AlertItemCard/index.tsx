import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { AlertRecord } from '@/types';
import { getStatusText, formatDuration, formatDate } from '@/utils';
import styles from './index.module.scss';

interface AlertItemCardProps {
  alert: AlertRecord;
  onRetry?: (alert: AlertRecord) => void;
  onAddRemark?: (alert: AlertRecord) => void;
}

const AlertItemCard: React.FC<AlertItemCardProps> = ({ alert, onRetry, onAddRemark }) => {
  const getStatusClass = () => {
    return alert.status === 'failed' ? styles.statusFailed : styles.statusWarning;
  };

  const getBorderClass = () => {
    return alert.status === 'failed' ? styles.dangerBorder : styles.warningBorder;
  };

  return (
    <View className={classnames(styles.card, getBorderClass())}>
      <View className={styles.header}>
        <View className={styles.mainInfo}>
          <Text className={styles.name}>{alert.apiName}</Text>
          <Text className={styles.group}>
            {alert.groupName} · {alert.apiUrl}
          </Text>
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
      </View>
    </View>
  );
};

export default AlertItemCard;
