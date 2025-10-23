import { useState } from 'react';
import { useApplicationState, useApplicationDispatch, useStorageOperations } from '../store/context';
import { getStorageInfo } from '../utils/localStorage';
import type { OverlayConfig } from '../types';
import './ConfigManager.css';

interface ConfigManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConfigManager({ isOpen, onClose }: ConfigManagerProps) {
  const state = useApplicationState();
  const dispatch = useApplicationDispatch();
  const { deleteConfigFromStorage, clearAllConfigs } = useStorageOperations();
  
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [storageInfo, setStorageInfo] = useState(getStorageInfo());

  // ストレージ情報を更新
  const updateStorageInfo = () => {
    setStorageInfo(getStorageInfo());
  };

  // 設定を読み込み
  const handleLoadConfig = (config: OverlayConfig) => {
    dispatch({ type: 'LOAD_CONFIG', payload: config });
    setSelectedConfig(config.id);
    onClose();
  };

  // 設定を削除
  const handleDeleteConfig = async (configId: string) => {
    await deleteConfigFromStorage(configId);
    setShowDeleteConfirm(null);
    updateStorageInfo();
  };

  // すべての設定をクリア
  const handleClearAll = async () => {
    await clearAllConfigs();
    setShowClearAllConfirm(false);
    updateStorageInfo();
  };

  // 日付をフォーマット
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // ファイルサイズをフォーマット
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="config-manager-overlay">
      <div className="config-manager">
        <div className="config-manager-header">
          <h2>設定管理</h2>
          <button 
            className="close-button"
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        {/* ストレージ情報 */}
        <div className="storage-info">
          <h3>ストレージ使用状況</h3>
          <div className="storage-stats">
            <div className="storage-bar">
              <div 
                className="storage-usage"
                style={{ width: `${storageInfo.usagePercentage}%` }}
              />
            </div>
            <div className="storage-details">
              <span>使用量: {formatFileSize(storageInfo.storageUsage)}</span>
              <span>制限: {formatFileSize(storageInfo.storageLimit)}</span>
              <span>使用率: {storageInfo.usagePercentage}%</span>
            </div>
          </div>
          <p>保存された設定数: {storageInfo.totalConfigs}</p>
        </div>

        {/* 設定一覧 */}
        <div className="config-list">
          <div className="config-list-header">
            <h3>保存された設定</h3>
            {state.savedConfigs.length > 0 && (
              <button
                className="clear-all-button"
                onClick={() => setShowClearAllConfirm(true)}
              >
                すべて削除
              </button>
            )}
          </div>

          {state.savedConfigs.length === 0 ? (
            <div className="no-configs">
              <p>保存された設定がありません。</p>
              <p>オーバーレイを作成して設定を保存してください。</p>
            </div>
          ) : (
            <div className="config-items">
              {state.savedConfigs.map((config) => (
                <div 
                  key={config.id} 
                  className={`config-item ${selectedConfig === config.id ? 'selected' : ''}`}
                >
                  <div className="config-info">
                    <h4>{config.name}</h4>
                    <div className="config-details">
                      <span>PDF: {config.pdfFile.name}</span>
                      <span>作成日: {formatDate(config.createdAt)}</span>
                      <span>更新日: {formatDate(config.updatedAt)}</span>
                      <span>透明度: {Math.round(config.opacity * 100)}%</span>
                    </div>
                  </div>
                  
                  <div className="config-actions">
                    <button
                      className="load-button"
                      onClick={() => handleLoadConfig(config)}
                      disabled={state.isLoading}
                    >
                      読み込み
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => setShowDeleteConfirm(config.id)}
                      disabled={state.isLoading}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* エラー表示 */}
        {state.error && (
          <div className="error-message">
            {state.error}
          </div>
        )}

        {/* 削除確認ダイアログ */}
        {showDeleteConfirm && (
          <div className="confirm-dialog-overlay">
            <div className="confirm-dialog">
              <h3>設定を削除しますか？</h3>
              <p>この操作は取り消せません。</p>
              <div className="confirm-actions">
                <button
                  className="cancel-button"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  キャンセル
                </button>
                <button
                  className="confirm-button"
                  onClick={() => handleDeleteConfig(showDeleteConfirm)}
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        )}

        {/* すべて削除確認ダイアログ */}
        {showClearAllConfirm && (
          <div className="confirm-dialog-overlay">
            <div className="confirm-dialog">
              <h3>すべての設定を削除しますか？</h3>
              <p>この操作は取り消せません。すべての保存された設定が削除されます。</p>
              <div className="confirm-actions">
                <button
                  className="cancel-button"
                  onClick={() => setShowClearAllConfirm(false)}
                >
                  キャンセル
                </button>
                <button
                  className="confirm-button"
                  onClick={handleClearAll}
                >
                  すべて削除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}