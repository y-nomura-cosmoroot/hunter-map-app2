import React, { useState, useEffect } from 'react';
import type { OverlayConfig } from '../types';
import { useStorageOperations } from '../store/context';
import { handleError, reportError, getUserFriendlyMessage } from '../utils/errorHandler';
import './OverlayControls.css';

interface OverlayControlsProps {
  overlay: OverlayConfig;
  onPositionChange: (lat: number, lng: number) => void;
  onOpacityChange: (opacity: number) => void;
  savedConfigs: OverlayConfig[];
}

const OverlayControls: React.FC<OverlayControlsProps> = ({
  overlay,
  onPositionChange,
  onOpacityChange,
  savedConfigs,
}) => {
  console.log('OverlayControls初期化開始:', { overlay, savedConfigs });

  const [opacityInput, setOpacityInput] = useState<number>(overlay.opacity);
  const [configName, setConfigName] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');

  const { saveConfigToStorage, deleteConfigFromStorage } = useStorageOperations();

  // オーバーレイが変更されたときに透明度を更新
  useEffect(() => {
    if (overlay) {
      setOpacityInput(overlay.opacity);
    }
  }, [overlay]);

  // 透明度変更ハンドラー
  const handleOpacityChange = (newOpacity: number) => {
    setOpacityInput(newOpacity);
    onOpacityChange(newOpacity);
  };

  // 位置微調整ハンドラー
  const handleFineTuning = (direction: 'north' | 'south' | 'east' | 'west', amount: number = 0.001) => {
    const currentLat = overlay.position?.center.lat || 0;
    const currentLng = overlay.position?.center.lng || 0;

    let newLat = currentLat;
    let newLng = currentLng;

    switch (direction) {
      case 'north':
        newLat += amount;
        break;
      case 'south':
        newLat -= amount;
        break;
      case 'east':
        newLng += amount;
        break;
      case 'west':
        newLng -= amount;
        break;
    }

    console.log(`位置微調整: ${direction}, 現在位置: ${currentLat}, ${currentLng}, 新しい位置: ${newLat}, ${newLng}`);
    onPositionChange(newLat, newLng);
  };

  // 設定保存ハンドラー
  const handleSaveConfig = async () => {
    if (!configName.trim()) {
      setSaveMessage('設定名を入力してください');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    try {
      setIsSaving(true);
      setSaveMessage('');

      // 現在のオーバーレイ設定をコピーして保存用に準備
      const configToSave: OverlayConfig = {
        ...overlay,
        name: configName.trim(),
        updatedAt: new Date(),
      };

      await saveConfigToStorage(configToSave);

      setSaveMessage('設定を保存しました');
      setConfigName(''); // 保存後は名前をクリア

      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      const appError = handleError(error, 'OverlayControls.handleSaveConfig');
      reportError(appError);
      setSaveMessage(getUserFriendlyMessage(appError));
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // 設定削除ハンドラー
  const handleDeleteConfig = async (configId: string, configName: string) => {
    if (!confirm(`設定「${configName}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      await deleteConfigFromStorage(configId);
      setSaveMessage('設定を削除しました');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      const appError = handleError(error, 'OverlayControls.handleDeleteConfig');
      reportError(appError);
      setSaveMessage(getUserFriendlyMessage(appError));
      setTimeout(() => setSaveMessage(''), 5000);
    }
  };

  return (
    <div className="overlay-controls">
      <h3>オーバーレイ調整</h3>

      {/* 基本情報 */}
      {import.meta.env.VITE_DEBUG_MODE === "TRUE" &&
        <div className="controls-section">
          <h4>基本情報</h4>
          <p><strong>名前:</strong> {overlay.name}</p>
          <p><strong>中心座標:</strong> {overlay.position?.center.lat.toFixed(6)}, {overlay.position?.center.lng.toFixed(6)}</p>
          <p><strong>作成日時:</strong> {new Date(overlay.createdAt).toLocaleString()}</p>
        </div>
      }
      {/* 不透明度調整 */}
      <div className="controls-section">
        <h4>不透明度調整</h4>
        <div className="opacity-control">
          <label htmlFor="opacity">不透明度: {Math.round(opacityInput * 100)}%</label>
          <input
            id="opacity"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={opacityInput}
            onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
            className="opacity-slider"
          />
        </div>
      </div>

      {/* 位置微調整 */}
      <div className="controls-section">
        <h4>位置微調整</h4>
        <div className="fine-tuning-controls">
          <div className="direction-controls">
            <button
              className="direction-btn north"
              onClick={() => handleFineTuning('north')}
              title="北へ移動"
            >
              ↑
            </button>
            <div className="horizontal-controls">
              <button
                className="direction-btn west"
                onClick={() => handleFineTuning('west')}
                title="西へ移動"
              >
                ←
              </button>
              <button
                className="direction-btn east"
                onClick={() => handleFineTuning('east')}
                title="東へ移動"
              >
                →
              </button>
            </div>
            <button
              className="direction-btn south"
              onClick={() => handleFineTuning('south')}
              title="南へ移動"
            >
              ↓
            </button>
          </div>
          <div className="fine-tuning-amounts">
            <button onClick={() => handleFineTuning('north', 0.0001)}>小 (0.0001°)</button>
            <button onClick={() => handleFineTuning('north', 0.001)}>中 (0.001°)</button>
            <button onClick={() => handleFineTuning('north', 0.01)}>大 (0.01°)</button>
          </div>
        </div>
      </div>

      {/* 設定保存 */}
      <div className="controls-section">
        <h4>設定保存</h4>
        <div className="save-config-form">
          <div className="input-group">
            <label htmlFor="config-name">設定名:</label>
            <input
              id="config-name"
              type="text"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              placeholder="設定名を入力してください"
              maxLength={50}
              disabled={isSaving}
            />
          </div>
          <button
            className="save-btn"
            onClick={handleSaveConfig}
            disabled={isSaving || !configName.trim()}
          >
            {isSaving ? '保存中...' : '設定を保存'}
          </button>
          {saveMessage && (
            <div className={`save-message ${saveMessage.includes('失敗') || saveMessage.includes('エラー') ? 'error' : 'success'}`}>
              {saveMessage}
            </div>
          )}
        </div>
      </div>

      {/* 保存された設定一覧 */}
      <div className="controls-section">
        <h4>保存された設定</h4>
        <p>保存済み設定数: {savedConfigs.length}</p>
        {savedConfigs.length > 0 ? (
          <div className="saved-configs-list">
            {savedConfigs.map((config) => (
              <div key={config.id} className="saved-config-item">
                <div className="config-info">
                  <div className="config-name">{config.name}</div>
                  <div className="config-details">
                    作成: {new Date(config.createdAt).toLocaleDateString()}
                    {config.updatedAt.getTime() !== config.createdAt.getTime() && (
                      <span> (更新: {new Date(config.updatedAt).toLocaleDateString()})</span>
                    )}
                  </div>
                </div>
                <div className="config-actions">
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteConfig(config.id, config.name)}
                    title="設定を削除"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-configs">保存された設定はありません</p>
        )}
      </div>
    </div>
  );
};

export default OverlayControls;