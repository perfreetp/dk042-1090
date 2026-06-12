import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Input, Textarea } from '@tarojs/components';
import Taro, { usePullDownRefresh } from '@tarojs/taro';
import classnames from 'classnames';
import { useInspection } from '@/store/InspectionContext';
import ApiItemCard from '@/components/ApiItemCard';
import { showToast } from '@/utils';
import { ApiConfig, HttpMethod } from '@/types';
import styles from './index.module.scss';

const GroupsPage: React.FC = () => {
  const {
    apiGroups,
    apiConfigs,
    runInspection,
    addApiConfig,
    updateApiConfig,
    deleteApiConfig,
    inspecting
  } = useInspection();

  const [activeGroup, setActiveGroup] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchKeyword, setSearchKeyword] = useState('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingApi, setEditingApi] = useState<ApiConfig | null>(null);
  const [deletingApi, setDeletingApi] = useState<ApiConfig | null>(null);

  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formMethod, setFormMethod] = useState<HttpMethod>('GET');
  const [formGroupId, setFormGroupId] = useState('');
  const [formExpectedStatusCode, setFormExpectedStatusCode] = useState('200');
  const [formDescription, setFormDescription] = useState('');

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
    await runInspection({ apiId: api.id });
    showToast(`${api.name} 巡检完成`, 'success');
  };

  const handleInspectGroup = async (groupId: string, groupName: string) => {
    if (inspecting) {
      showToast('正在巡检中...');
      return;
    }
    const groupApis = apiConfigs.filter(a => a.groupId === groupId);
    if (groupApis.length === 0) {
      showToast('该分组暂无接口');
      return;
    }
    console.log('[GroupsPage] Batch inspecting group:', groupId);
    showToast(`正在巡检 ${groupApis.length} 个接口...`, 'loading', 1500);
    await runInspection({ groupId });
    showToast(`${groupName} 巡检完成`, 'success');
  };

  const handleApiClick = (api: ApiConfig) => {
    Taro.navigateTo({ url: `/pages/debug/index?id=${api.id}` });
  };

  const handleAddApi = () => {
    setEditingApi(null);
    setFormName('');
    setFormUrl('');
    setFormMethod('GET');
    setFormGroupId(activeGroup === 'all' ? apiGroups[0]?.id || '' : activeGroup);
    setFormExpectedStatusCode('200');
    setFormDescription('');
    setShowFormModal(true);
  };

  const handleEditApi = (api: ApiConfig, e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    console.log('[GroupsPage] Editing API:', api.id);
    setEditingApi(api);
    setFormName(api.name);
    setFormUrl(api.url);
    setFormMethod(api.method);
    setFormGroupId(api.groupId);
    setFormExpectedStatusCode(api.expectedStatusCode.toString());
    setFormDescription(api.description || '');
    setShowFormModal(true);
  };

  const handleDeleteApi = (api: ApiConfig, e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    console.log('[GroupsPage] Prepare delete API:', api.id);
    setDeletingApi(api);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (deletingApi) {
      console.log('[GroupsPage] Deleting API:', deletingApi.id);
      deleteApiConfig(deletingApi.id);
      showToast(`${deletingApi.name} 已删除`, 'success');
    }
    setShowDeleteModal(false);
    setDeletingApi(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setDeletingApi(null);
  };

  const handleCloseForm = () => {
    setShowFormModal(false);
    setEditingApi(null);
  };

  const handleSubmitForm = () => {
    if (!formName.trim()) {
      showToast('请输入接口名称', 'error');
      return;
    }
    if (!formUrl.trim()) {
      showToast('请输入接口URL', 'error');
      return;
    }
    if (!formGroupId) {
      showToast('请选择所属分组', 'error');
      return;
    }

    const group = apiGroups.find(g => g.id === formGroupId);
    if (!group) {
      showToast('所选分组不存在', 'error');
      return;
    }

    const baseData = {
      name: formName.trim(),
      url: formUrl.trim(),
      method: formMethod,
      groupId: formGroupId,
      groupName: group.name,
      expectedStatusCode: parseInt(formExpectedStatusCode) || 200,
      description: formDescription.trim() || undefined,
      params: [],
      expectedFields: []
    };

    if (editingApi) {
      const updated: ApiConfig = {
        ...editingApi,
        ...baseData
      };
      console.log('[GroupsPage] Updating API:', updated.id);
      updateApiConfig(updated);
      showToast(`${updated.name} 已更新`, 'success');
    } else {
      console.log('[GroupsPage] Adding new API:', baseData.name);
      addApiConfig(baseData);
      showToast(`${baseData.name} 已添加`, 'success');
    }

    setShowFormModal(false);
    setEditingApi(null);
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
          <View className={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text className={styles.title}>接口分组</Text>
              <Text className={styles.subtitle}>
                共 {apiGroups.length} 个分组 · {apiConfigs.length} 个接口
              </Text>
            </View>
            <View className={styles.addBtn} onClick={handleAddApi}>
              +
            </View>
          </View>
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
          {apiGroups.map(group => {
            const count = apiConfigs.filter(a => a.groupId === group.id).length;
            return (
              <View
                key={group.id}
                className={classnames(styles.groupTab, {
                  [styles.groupTabActive]: activeGroup === group.id
                })}
                onClick={() => setActiveGroup(group.id)}
              >
                {group.name} ({count})
              </View>
            );
          })}
        </ScrollView>

        {activeGroup === 'all' && (
          <View>
            {allApis.length > 0 ? (
              allApis.map(api => (
                <View key={api.id}>
                  <ApiItemCard
                    api={api}
                    onInspect={handleInspectApi}
                    onClick={handleApiClick}
                  />
                  <View className={styles.apiItemActions}>
                    <View
                      className={classnames(styles.actionBtn, styles.editBtn)}
                      onClick={(e) => handleEditApi(api, e as any)}
                    >
                      ✏️ 编辑
                    </View>
                    <View
                      className={classnames(styles.actionBtn, styles.deleteBtn)}
                      onClick={(e) => handleDeleteApi(api, e as any)}
                    >
                      🗑️ 删除
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View className={styles.emptyState}>
                <Text className={styles.emptyIcon}>🔍</Text>
                <Text className={styles.emptyTitle}>未找到匹配的接口</Text>
                <Text className={styles.emptyDesc}>请尝试其他关键词或点击右上角 + 添加</Text>
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
                <View style={{ display: 'flex', gap: '16rpx', alignItems: 'center' }}>
                  <View
                    className={styles.actionBtn}
                    style={{
                      flex: 'none',
                      height: '48rpx',
                      padding: '0 20rpx',
                      background: 'linear-gradient(135deg, #165dff 0%, #4080ff 100%)',
                      color: '#ffffff',
                      fontSize: '22rpx',
                      fontWeight: 600,
                      borderRadius: '16rpx',
                      boxShadow: '0 2rpx 8rpx rgba(22,93,255,0.25)'
                    }}
                    onClick={(e) => { e.stopPropagation?.(); handleInspectGroup(group.id, group.name); }}
                  >
                    🚀 批量巡检
                  </View>
                  <View
                    className={styles.actionBtn}
                    style={{
                      flex: 'none',
                      height: '48rpx',
                      padding: '0 20rpx',
                      background: 'rgba(22,93,255,0.08)',
                      color: '#165dff',
                      fontSize: '22rpx',
                      borderRadius: '16rpx'
                    }}
                    onClick={(e) => { e.stopPropagation?.(); handleAddApi(); }}
                  >
                    + 添加
                  </View>
                  <View
                    className={styles.toggleBtn}
                    onClick={() => toggleGroup(group.id)}
                  >
                    {isExpanded ? '收起' : '展开'}
                  </View>
                </View>
              </View>

              {isExpanded && (
                <View className={styles.apiList}>
                  {groupApis.length > 0 ? (
                    groupApis.map(api => (
                      <View key={api.id}>
                        <ApiItemCard
                          api={api}
                          onInspect={handleInspectApi}
                          onClick={handleApiClick}
                        />
                        <View className={styles.apiItemActions}>
                          <View
                            className={classnames(styles.actionBtn, styles.editBtn)}
                            onClick={(e) => handleEditApi(api, e as any)}
                          >
                            ✏️ 编辑
                          </View>
                          <View
                            className={classnames(styles.actionBtn, styles.deleteBtn)}
                            onClick={(e) => handleDeleteApi(api, e as any)}
                          >
                            🗑️ 删除
                          </View>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View className={styles.emptyState} style={{ padding: '48rpx 0', marginTop: 0 }}>
                      <Text className={styles.emptyDesc}>暂无接口，点击上方 + 添加</Text>
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

      {showFormModal && (
        <View className={styles.modalMask} onClick={handleCloseForm}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation?.()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>
                {editingApi ? '编辑接口' : '新增接口'}
              </Text>
              <View className={styles.modalClose} onClick={handleCloseForm}>
                ×
              </View>
            </View>
            <ScrollView className={styles.modalBody} scrollY>
              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>接口名称 *</Text>
                <Input
                  className={styles.formInput}
                  placeholder="如：获取用户信息"
                  value={formName}
                  onInput={(e) => setFormName(e.detail.value)}
                  maxlength={50}
                />
              </View>

              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>接口URL *</Text>
                <Input
                  className={styles.formInput}
                  placeholder="如：https://api.example.com/user/info"
                  value={formUrl}
                  onInput={(e) => setFormUrl(e.detail.value)}
                />
              </View>

              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>请求方法</Text>
                <View className={styles.methodSelector}>
                  {(['GET', 'POST', 'PUT', 'DELETE'] as HttpMethod[]).map(method => (
                    <View
                      key={method}
                      className={classnames(styles.methodOption, {
                        [styles.methodOptionActive]: formMethod === method
                      })}
                      onClick={() => setFormMethod(method)}
                    >
                      {method}
                    </View>
                  ))}
                </View>
              </View>

              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>所属分组 *</Text>
                <View className={styles.groupSelector}>
                  {apiGroups.map(group => (
                    <View
                      key={group.id}
                      className={classnames(styles.groupOption, {
                        [styles.groupOptionActive]: formGroupId === group.id
                      })}
                      onClick={() => setFormGroupId(group.id)}
                    >
                      {group.name}
                    </View>
                  ))}
                </View>
              </View>

              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>期望状态码</Text>
                <Input
                  className={styles.formInput}
                  type="number"
                  placeholder="如：200"
                  value={formExpectedStatusCode}
                  onInput={(e) => setFormExpectedStatusCode(e.detail.value)}
                />
              </View>

              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>接口描述</Text>
                <Textarea
                  className={styles.formTextarea}
                  placeholder="选填，简要描述接口用途"
                  value={formDescription}
                  onInput={(e) => setFormDescription(e.detail.value)}
                  maxlength={200}
                />
              </View>
            </ScrollView>
            <View className={styles.modalFooter}>
              <View
                className={classnames(styles.modalBtn, styles.modalBtnCancel)}
                onClick={handleCloseForm}
              >
                取消
              </View>
              <View
                className={classnames(styles.modalBtn, styles.modalBtnConfirm)}
                onClick={handleSubmitForm}
              >
                {editingApi ? '保存修改' : '添加接口'}
              </View>
            </View>
          </View>
        </View>
      )}

      {showDeleteModal && deletingApi && (
        <View className={styles.modalMask} onClick={handleCancelDelete}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation?.()}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>确认删除</Text>
              <View className={styles.modalClose} onClick={handleCancelDelete}>
                ×
              </View>
            </View>
            <View className={styles.modalBody}>
              <View style={{ textAlign: 'center', padding: '32rpx 0' }}>
                <Text style={{ fontSize: '80rpx' }}>⚠️</Text>
                <Text className={styles.confirmText}>
                  确定要删除接口 <Text className={styles.confirmApiName}>{deletingApi.name}</Text> 吗？
                </Text>
                <Text className={styles.confirmText} style={{ fontSize: '24rpx', color: '#86909c', marginTop: '16rpx' }}>
                  删除后该接口的巡检记录也会被清除，此操作不可恢复
                </Text>
              </View>
            </View>
            <View className={styles.modalFooter}>
              <View
                className={classnames(styles.modalBtn, styles.modalBtnCancel)}
                onClick={handleCancelDelete}
              >
                取消
              </View>
              <View
                className={classnames(styles.modalBtn, styles.modalBtnDanger)}
                onClick={handleConfirmDelete}
              >
                确认删除
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default GroupsPage;
