import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

interface StatCardProps {
  value: string | number;
  label: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  icon?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  type = 'info',
  icon
}) => {
  const iconMap: Record<string, string> = {
    success: '✓',
    error: '✕',
    warning: '!',
    info: 'i'
  };

  return (
    <View className={styles.card}>
      <View className={classnames(styles.iconWrapper, styles[type])}>
        <Text className={classnames(styles.iconText, styles[`${type}Text`])}>
          {icon || iconMap[type]}
        </Text>
      </View>
      <View className={styles.content}>
        <Text className={styles.value}>{value}</Text>
        <Text className={styles.label}>{label}</Text>
      </View>
    </View>
  );
};

export default StatCard;
