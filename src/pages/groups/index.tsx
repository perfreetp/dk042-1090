import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import { useInspection } from '@/store/InspectionContext';
import ApiItemCard from '@/components/ApiItemCard';
import { showToast } from '@/utils';
import { ApiConfig } from '@/types';
import styles from './index.module.scss';

const GroupsPage: React.FC = () => {
  const { apiGroups, apiConfigs, runInspection, inspecting } = useInspection();
  const [activeGroup, setActiveGroup] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchKeyword, setSearchKeyword] = useState('');

  usePullDownRefresh(() => {
    Taro.stopPullDownRefresh();
  });

  const toggleGroup = (groupId: string) => {
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

  const handleInspectApi = async (api: ApiConfig) => {
    console.log('[GroupsPage] Inspecting API:', api.id);
    await runInspection(api.id);
    showToast(`${api.name} 巡检完成`, 'success');
  };

  const handleApiClick = (api: ApiConfig) => {
    Taro.navigateTo({ url: `/pages/debug/index?id=${api.id}` });
  };

  const filteredGroups = useMemo(() => {
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      return apiGroups.filter(g =>
        g.name.toLowerCase().includes(keyword) ||
        g.businessLine.toLowerCase().includes(keyword)
      );
    }
    return apiGroups;
  }, [apiGroups, searchKeyword]);

  const getGroupApis = (groupId: string) => {
    let apis = apiConfigs.filter(a => a.groupId === groupId);
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase();
      apis = apis.filter(a =>
        a.name.toLowerCase().includes(keyword) ||
        a.url.toLowerCase().includes(keyword)
      );
    }
    return apis;
  };

  const allApis = useMemo(() => {
    if (activeGroup === 'all') {
      if (searchKeyword.trim()) {
        const keyword = searchKeyword.toLowerCase();
        return apiConfigs.filter(a =>
          a.name.toLowerCase().includes(keyword) ||
          a.url.toLowerCase().includes(keyword) ||
          a.groupName.toLowerCase().includes(keyword)
        );
      }
      return apiConfigs;
    }
    return [];
  }, [activeGroup, apiConfigs, searchKeyword]);

  return (
    <ScrollView className={styles.page} scrollY>
      <View className="pageContainer">
        <View className={styles.header}>
          <Text className={styles.title}>接口分组</Text>
          <Text className={styles.subtitle}>
            共 {apiGroups.length} 个分组 · {apiConfigs.length} 个接口
          </Text>
          <View className={styles.searchBar}>
            <Input
              className={styles.searchInput}
              placeholder="搜索接口名称、URL或分组..."
              placeholderStyle="color: rgba(255,255,255,0.6)"
              value={searchKeyword}
              onInput={(e) => setSearchKeyword(e.detail.value)}
            />
          </View>
        </View>

        <ScrollView
          className={styles.groupTabs}
          scrollX
          enhanced
          showScrollbar={false}
        >
          <View
            className={classnames(styles.groupTab, {
              [styles.groupTabActive]: activeGroup === 'all'
            })}
            onClick={() => setActiveGroup('all')}
          >
            全部 ({apiConfigs.length})
          </View>
          {apiGroups.map(group => (
            <View
              key={group.id}
              className={classnames(styles.groupTab, {
                [styles.groupTabActive]: activeGroup === group.id
              })}
              onClick={() => setActiveGroup(group.id)}
            >
              {group.name} ({group.apiCount})
            </View>
          ))}
        </ScrollView>

        {activeGroup === 'all' && (
          <View>
            {allApis.length > 0 ? (
              allApis.map(api => (
                <ApiItemCard
                  key={api.id}
                  api={api}
                  onInspect={handleInspectApi}
                  onClick={handleApiClick}
                />
              ))
            ) : (
              <View className={styles.emptyState}>
                <Text className={styles.emptyIcon}>🔍</Text>
                <Text className={styles.emptyTitle}>未找到匹配的接口</Text>
                <Text className={styles.emptyDesc}>请尝试其他关键词</Text>
              </View>
            )}
          </View>
        )}

        {activeGroup !== 'all' && filteredGroups.filter(g => g.id === activeGroup).map(group => {
          const groupApis = getGroupApis(group.id);
          const successCount = groupApis.filter(a => a.lastStatus === 'success').length;
          const failedCount = groupApis.filter(a => a.lastStatus === 'failed').length;
          const rate = groupApis.length > 0
            ? ((successCount / groupApis.length) * 100).toFixed(1)
            : '0';
          const isExpanded = expandedGroups.has(group.id);

          return (
            <View key={group.id} className={styles.groupCard}>
              <View className={styles.groupHeader}>
                <View className={styles.groupInfo}>
                  <Text className={styles.groupName}>{group.name}</Text>
                  <Text className={styles.groupDesc}>
                    {group.description || group.businessLine}
                  </Text>
                </View>
                <View className={styles.groupStats}>
                  <View className={styles.groupStat}>
                    <Text
                      className={classnames(styles.groupStatValue, {
                        [styles.successRate]: Number(rate) >= 95,
                        [styles.warnRate]: Number(rate) >= 80 && Number(rate) < 95,
                        [styles.errorRate]: Number(rate) < 80
                      })}
                    >
                      {rate}%
                    </Text>
                    <Text className={styles.groupStatLabel}>成功率</Text>
                  </View>
                  <View className={styles.groupStat}>
                    <Text className={styles.groupStatValue}>{groupApis.length}</Text>
                    <Text className={styles.groupStatLabel}>接口</Text>
                  </View>
                </View>
              </View>

              <View
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '0rpx'
                }}
              >
                <View style={{ display: 'flex', gap: '32rpx', fontSize: '24rpx', color: '#86909c' }}>
                  <Text>✓ 成功 {successCount}</Text>
                  <Text style={{ color: '#f53f3f' }}>✕ 失败 {failedCount}</Text>
                </View>
                <View
                  className={styles.toggleBtn}
                  onClick={() => toggleGroup(group.id)}
                >
                  {isExpanded ? '收起' : '展开'}
                </View>
              </View>

              {isExpanded && (
                <View className={styles.apiList}>
                  {groupApis.length > 0 ? (
                    groupApis.map(api => (
                      <ApiItemCard
                        key={api.id}
                        api={api}
                        onInspect={handleInspectApi}
                        onClick={handleApiClick}
                      />
                    ))
                  ) : (
                    <View className={styles.emptyState} style={{ padding: '32rpx 0' }}>
                      <Text className={styles.emptyDesc}>暂无匹配的接口</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {activeGroup !== 'all' && filteredGroups.filter(g => g.id === activeGroup).length === 0 && (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📂</Text>
            <Text className={styles.emptyTitle}>未找到匹配的分组</Text>
            <Text className={styles.emptyDesc}>请尝试其他关键词</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default GroupsPage;
