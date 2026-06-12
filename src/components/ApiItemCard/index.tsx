import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { ApiConfig, ApiStatus } from '@/types';
import { getStatusText, formatDuration, formatDate } from '@/utils';
import styles from './index.module.scss';

interface ApiItemCardProps {
  api: ApiConfig;
  onInspect?: (api: ApiConfig) => void;
  onClick?: (api: ApiConfig) => void;
}

const ApiItemCard: React.FC<ApiItemCardProps> = ({ api, onInspect, onClick }) => {
  const getMethodClass = () => {
    const map: Record<string, string> = {
      GET: styles.methodGet,
      POST: styles.methodPost,
      PUT: styles.methodPut,
      DELETE: styles.methodDelete,
      PATCH: styles.methodPost
    };
    return map[api.method] || styles.methodPost;
  };

  const getStatusClass = (status?: ApiStatus) => {
    const map: Record<string, string> = {
      success: styles.statusSuccess,
      failed: styles.statusFailed,
      warning: styles.statusWarning,
      pending: styles.statusPending,
      unknown: styles.statusUnknown
    };
    return map[status || 'unknown'] || styles.statusUnknown;
  };

  const getBorderClass = (status?: ApiStatus) => {
    if (api.consecutiveFailures >= 3) return styles.dangerBorder;
    if (status === 'warning') return styles.warningBorder;
    if (status === 'success') return styles.successBorder;
    return '';
  };

  return (
    <View
      className={classnames(styles.card, getBorderClass(api.lastStatus))}
      onClick={() => onClick?.(api)}
    >
      <View className={styles.header}>
        <View className={styles.mainInfo}>
          <Text className={styles.name}>{api.name}</Text>
          <Text className={styles.url}>{api.url}</Text>
        </View>
        <View className={classnames(styles.statusBadge, getStatusClass(api.lastStatus))}>
          {getStatusText(api.lastStatus || 'unknown')}
        </View>
      </View>

      <View className={styles.meta}>
        <Text className={classnames(styles.tag, getMethodClass())}>{api.method}</Text>
        <Text className={classnames(styles.tag, styles.groupTag)}>{api.groupName}</Text>
        <Text className={classnames(styles.tag, styles.groupTag)}>
          期望 {api.expectedStatusCode}
        </Text>
        {api.consecutiveFailures >= 3 && (
          <Text className={styles.dangerBadge}>连续失败 {api.consecutiveFailures} 次</Text>
        )}
      </View>

      <View className={styles.footer}>
        <View className={styles.footerLeft}>
          {api.lastDuration !== undefined && (
            <View className={styles.footerItem}>
              <Text>⏱</Text>
              <Text>{formatDuration(api.lastDuration)}</Text>
            </View>
          )}
          {api.lastCheckedAt && (
            <View className={styles.footerItem}>
              <Text>🕐</Text>
              <Text>{formatDate(api.lastCheckedAt, 'MM-DD HH:mm')}</Text>
            </View>
          )}
        </View>
        <Button
          className={styles.inspectBtn}
          onClick={(e) => {
            e.stopPropagation?.();
            onInspect?.(api);
          }}
        >
          巡检
        </Button>
      </View>
    </View>
  );
};

export default ApiItemCard;
