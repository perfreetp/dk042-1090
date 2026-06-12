import React, { useState, useMemo } from 'react';
import { View, Text, Input, Button, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { useInspection } from '@/store/InspectionContext';
import { getStatusText, formatDuration, formatDate, showToast, copyToClipboard } from '@/utils';
import { ApiConfig, ApiParam, ApiExpectedField, InspectionResult, HttpMethod, ApiStatus } from '@/types';
import styles from './index.module.scss';

const DebugPage: React.FC = () => {
  const router = useRouter();
  const apiId = router.params.id || '';
  const { getApiById, runInspection, inspectionResults, updateApiConfig, inspecting } = useInspection();

  const api = useMemo(() => getApiById(apiId), [apiId, getApiById]);

  const [expectedStatusCode, setExpectedStatusCode] = useState(
    api?.expectedStatusCode?.toString() || '200'
  );
  const [params, setParams] = useState<ApiParam[]>(api?.params || []);
  const [expectedFields, setExpectedFields] = useState<ApiExpectedField[]>(
    api?.expectedFields || []
  );
  const [lastResult, setLastResult] = useState<InspectionResult | null>(() => {
    if (apiId) {
      return inspectionResults.find(r => r.apiId === apiId) || null;
    }
    return null;
  });

  if (!api) {
    return (
      <View style={{ padding: '64rpx', textAlign: 'center' }}>
        <Text style={{ fontSize: '32rpx', color: '#86909c' }}>未找到接口配置</Text>
      </View>
    );
  }

  const handleRunInspect = async () => {
    console.log('[DebugPage] Running inspection for:', api.id);
    showToast('开始巡检...', 'loading', 1000);
    const newResults = await runInspection(api.id);
    const latestResult = newResults.find(r => r.apiId === api.id);
    if (latestResult) {
      console.log('[DebugPage] Updating lastResult with new inspection:', latestResult.status, latestResult.duration);
      setLastResult(latestResult);
    }
    showToast('巡检完成', 'success');
  };

  const handleSaveConfig = () => {
    const updated: ApiConfig = {
      ...api,
      expectedStatusCode: parseInt(expectedStatusCode) || 200,
      params,
      expectedFields
    };
    updateApiConfig(updated);
    showToast('配置已保存', 'success');
  };

  const handleCopyUrl = () => {
    copyToClipboard(api.url);
  };

  const addParam = () => {
    setParams([...params, { key: '', value: '', type: 'query' }]);
  };

  const updateParam = (index: number, field: keyof ApiParam, value: string) => {
    const next = [...params];
    next[index] = { ...next[index], [field]: value } as ApiParam;
    setParams(next);
  };

  const removeParam = (index: number) => {
    setParams(params.filter((_, i) => i !== index));
  };

  const addExpectedField = () => {
    setExpectedFields([
      ...expectedFields,
      { field: '', expectedValue: '', operator: 'equals' }
    ]);
  };

  const updateExpectedField = (index: number, field: keyof ApiExpectedField, value: string) => {
    const next = [...expectedFields];
    next[index] = { ...next[index], [field]: value } as ApiExpectedField;
    setExpectedFields(next);
  };

  const removeExpectedField = (index: number) => {
    setExpectedFields(expectedFields.filter((_, i) => i !== index));
  };

  const getResultClass = (status?: ApiStatus) => {
    switch (status) {
      case 'success': return styles.resultSuccess;
      case 'failed': return styles.resultFailed;
      case 'warning': return styles.resultWarning;
      default: return '';
    }
  };

  const getStatusClass = (status?: ApiStatus) => {
    switch (status) {
      case 'success': return styles.statusSuccess;
      case 'failed': return styles.statusFailed;
      case 'warning': return styles.statusWarning;
      default: return '';
    }
  };

  return (
    <ScrollView className={styles.page} scrollY>
      <View className="pageContainer">
        <View className={styles.apiHeader}>
          <Text className={styles.apiName}>{api.name}</Text>
          <Text className={styles.apiUrl} onClick={handleCopyUrl}>{api.url}</Text>
          <View className={styles.apiMeta}>
            <Text className={styles.metaTag}>{api.method}</Text>
            <Text className={styles.metaTag}>{api.groupName}</Text>
            <Text className={styles.metaTag}>期望 {api.expectedStatusCode}</Text>
            {api.consecutiveFailures >= 3 && (
              <Text className={styles.metaTag} style={{ background: 'rgba(245,63,63,0.3)' }}>
                连续失败 {api.consecutiveFailures} 次
              </Text>
            )}
          </View>
        </View>

        {lastResult && (
          <View className={classnames(styles.resultCard, getResultClass(lastResult.status))}>
            <View className={styles.resultHeader}>
              <View className={classnames(styles.resultStatus, getStatusClass(lastResult.status))}>
                {getStatusText(lastResult.status)}
              </View>
              <Text className={styles.resultTime}>
                {formatDuration(lastResult.duration)} · {formatDate(lastResult.checkedAt, 'HH:mm:ss')}
              </Text>
            </View>

            <View className={styles.validationItem}>
              <Text className={styles.validationField}>状态码</Text>
              <Text className={classnames(styles.validationResult, {
                [styles.validPass]: lastResult.actualStatusCode === lastResult.statusCode,
                [styles.validFail]: lastResult.actualStatusCode !== lastResult.statusCode
              })}>
                期望 {lastResult.statusCode} / 实际 {lastResult.actualStatusCode}
                {lastResult.actualStatusCode === lastResult.statusCode ? ' ✓' : ' ✕'}
              </Text>
            </View>

            {lastResult.fieldValidations && lastResult.fieldValidations.length > 0 && (
              <View>
                {lastResult.fieldValidations.map((v, i) => (
                  <View key={i} className={styles.validationItem}>
                    <Text className={styles.validationField}>字段 {v.field}</Text>
                    <Text className={classnames(styles.validationResult, {
                      [styles.validPass]: v.passed,
                      [styles.validFail]: !v.passed
                    })}>
                      {v.passed ? '通过 ✓' : `失败 ✕ (期望 ${v.expected})`}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {lastResult.errorMessage && (
              <View className={styles.resultDetail} style={{ marginTop: '24rpx' }}>
                {lastResult.errorMessage}
              </View>
            )}
          </View>
        )}

        <View className={styles.card}>
          <Text className={styles.cardTitle}>⚙️ 基本配置</Text>

          <View className={styles.formRow}>
            <Text className={styles.formLabel}>期望状态码</Text>
            <Input
              className={styles.formInput}
              type="number"
              value={expectedStatusCode}
              onInput={(e) => setExpectedStatusCode(e.detail.value)}
              placeholder="如 200"
            />
          </View>

          <View className={styles.formRow}>
            <Text className={styles.formLabel}>请求方法</Text>
            <View className={styles.selectWrapper}>
              {(['GET', 'POST', 'PUT', 'DELETE'] as HttpMethod[]).map(method => (
                <View
                  key={method}
                  className={classnames(styles.optionBtn, {
                    [styles.optionActive]: api.method === method
                  })}
                >
                  {method}
                </View>
              ))}
            </View>
          </View>
        </View>

        <View className={styles.card}>
          <Text className={styles.cardTitle}>📋 请求参数</Text>

          {params.length > 0 && params.map((param, index) => (
            <View key={index} className={styles.paramItem}>
              <View className={styles.paramType}>{param.type}</View>
              <Input
                className={classnames(styles.paramInput, styles.paramKey)}
                placeholder="参数名"
                value={param.key}
                onInput={(e) => updateParam(index, 'key', e.detail.value)}
              />
              <Input
                className={classnames(styles.paramInput, styles.paramValue)}
                placeholder="参数值"
                value={param.value}
                onInput={(e) => updateParam(index, 'value', e.detail.value)}
              />
              <View className={styles.removeBtn} onClick={() => removeParam(index)}>
                ×
              </View>
            </View>
          ))}

          <Button className={styles.addParamBtn} onClick={addParam}>
            + 添加参数
          </Button>
        </View>

        <View className={styles.card}>
          <Text className={styles.cardTitle}>✅ 字段校验</Text>

          {expectedFields.length > 0 && expectedFields.map((field, index) => (
            <View key={index} className={styles.paramItem}>
              <Input
                className={classnames(styles.paramInput, styles.paramKey)}
                placeholder="字段路径"
                value={field.field}
                onInput={(e) => updateExpectedField(index, 'field', e.detail.value)}
              />
              <View className={styles.selectWrapper} style={{ flex: '0 0 120rpx' }}>
                <View className={classnames(styles.optionBtn, styles.optionActive)}>
                  {field.operator === 'equals' ? '等于' : field.operator === 'notEmpty' ? '非空' : '包含'}
                </View>
              </View>
              <Input
                className={classnames(styles.paramInput, styles.paramValue)}
                placeholder="期望值"
                value={field.expectedValue}
                onInput={(e) => updateExpectedField(index, 'expectedValue', e.detail.value)}
              />
              <View className={styles.removeBtn} onClick={() => removeExpectedField(index)}>
                ×
              </View>
            </View>
          ))}

          <Button className={styles.addParamBtn} onClick={addExpectedField}>
            + 添加校验规则
          </Button>
        </View>

        {api.description && (
          <View className={styles.card}>
            <Text className={styles.cardTitle}>📝 接口描述</Text>
            <Text style={{ fontSize: '28rpx', color: '#4e5969', lineHeight: 1.6 }}>
              {api.description}
            </Text>
          </View>
        )}
      </View>

      <View className={styles.bottomBar}>
        <Button className={classnames(styles.btn, styles.btnSecondary)} onClick={handleSaveConfig}>
          保存配置
        </Button>
        <Button className={classnames(styles.btn, styles.btnPrimary)} onClick={handleRunInspect}>
          {inspecting ? '巡检中...' : '立即巡检'}
        </Button>
      </View>
    </ScrollView>
  );
};

export default DebugPage;
