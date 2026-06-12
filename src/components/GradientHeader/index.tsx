import React from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  showActions?: boolean;
  onInspectAll?: () => void;
  onViewReport?: () => void;
}

const GradientHeader: React.FC<GradientHeaderProps> = ({
  title,
  subtitle,
  showActions = false,
  onInspectAll,
  onViewReport
}) => {
  return (
    <View className={styles.header}>
      <Text className={styles.title}>{title}</Text>
      {subtitle && <Text className={styles.subtitle}>{subtitle}</Text>}
      {showActions && (
        <View className={styles.actions}>
          <Button
            className={`${styles.actionBtn} ${styles.primaryBtn}`}
            onClick={onInspectAll}
          >
            一键巡检
          </Button>
          <Button
            className={styles.actionBtn}
            onClick={() => onViewReport?.()}
          >
            查看报告
          </Button>
        </View>
      )}
    </View>
  );
};

export default GradientHeader;
