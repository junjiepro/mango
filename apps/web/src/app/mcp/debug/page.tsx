/**
 * MCP Debug Panel
 * 用于调试和测试 MCP 服务和工具
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

interface MCPService {
  service_id: string;
  service_name: string;
  service_type: string;
  tools: MCPTool[];
  is_online: boolean;
  error?: string;
}

interface Device {
  binding_id: string;
  device_name: string;
  device_id: string;
  platform: string;
  status: string;
  device_url: string;
  services: MCPService[];
  total_tools: number;
}

export default function MCPDebugPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [toolArgs, setToolArgs] = useState<string>('{}');
  const [toolResult, setToolResult] = useState<any>(null);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mcp/tools?include_offline=true');
      if (!response.ok) {
        throw new Error('Failed to load devices');
      }
      const data = await response.json();
      setDevices(data.devices || []);
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeTool = async () => {
    if (!selectedDevice || !selectedService || !selectedTool) {
      return;
    }

    const deviceData = devices.find((d) => d.binding_id === selectedDevice);
    if (!deviceData?.device_url) {
      setToolResult({
        success: false,
        error: '设备 URL 不可用',
      });
      return;
    }

    try {
      setExecuting(true);
      setToolResult(null);

      const args = JSON.parse(toolArgs);

      // 直接调用 CLI 设备的 MCP 工具
      const response = await fetch(
        `${deviceData.device_url}/mcp/${selectedService}/tools/${selectedTool.name}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(args),
        }
      );

      const result = await response.json();
      setToolResult({
        success: response.ok,
        service: selectedService,
        tool: selectedTool.name,
        result: result.result || result,
      });
    } catch (error) {
      setToolResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setExecuting(false);
    }
  };

  const selectedDeviceData = devices.find((d) => d.binding_id === selectedDevice);
  const selectedServiceData = selectedDeviceData?.services.find(
    (s) => s.service_name === selectedService
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载 MCP 服务...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">MCP 调试面板</h1>
        <p className="text-gray-600">测试和调试设备的 MCP 服务和工具</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 设备列表 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">设备列表</h2>
          <div className="space-y-2">
            {devices.map((device) => (
              <button
                key={device.binding_id}
                onClick={() => {
                  setSelectedDevice(device.binding_id);
                  setSelectedService(null);
                  setSelectedTool(null);
                  setToolResult(null);
                }}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedDevice === device.binding_id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{device.device_name}</div>
                    <div className="text-sm text-gray-500">
                      {device.platform} • {device.total_tools} 工具
                    </div>
                  </div>
                  <div
                    className={`w-3 h-3 rounded-full ${
                      device.status === 'active' ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                </div>
              </button>
            ))}
            {devices.length === 0 && (
              <p className="text-gray-500 text-center py-4">没有找到设备</p>
            )}
          </div>
        </div>

        {/* 服务和工具列表 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">服务和工具</h2>
          {selectedDeviceData ? (
            <div className="space-y-4">
              {selectedDeviceData.services.map((service) => (
                <div key={service.service_id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{service.service_name}</h3>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        service.is_online
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {service.is_online ? '在线' : '离线'}
                    </span>
                  </div>
                  {service.error && (
                    <p className="text-sm text-red-600 mb-2">{service.error}</p>
                  )}
                  <div className="space-y-1">
                    {service.tools.map((tool) => (
                      <button
                        key={tool.name}
                        onClick={() => {
                          setSelectedService(service.service_name);
                          setSelectedTool(tool);
                          setToolResult(null);
                          setToolArgs('{}');
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          selectedTool?.name === tool.name &&
                          selectedService === service.service_name
                            ? 'bg-blue-100 text-blue-800'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        {tool.name}
                      </button>
                    ))}
                    {service.tools.length === 0 && (
                      <p className="text-sm text-gray-500 px-3 py-2">没有可用工具</p>
                    )}
                  </div>
                </div>
              ))}
              {selectedDeviceData.services.length === 0 && (
                <p className="text-gray-500 text-center py-4">没有配置 MCP 服务</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">请选择一个设备</p>
          )}
        </div>

        {/* 工具测试面板 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">工具测试</h2>
          {selectedTool ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-1">{selectedTool.name}</h3>
                {selectedTool.description && (
                  <p className="text-sm text-gray-600 mb-3">{selectedTool.description}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">参数 (JSON)</label>
                <textarea
                  value={toolArgs}
                  onChange={(e) => setToolArgs(e.target.value)}
                  className="w-full h-32 px-3 py-2 border rounded-lg font-mono text-sm"
                  placeholder='{"key": "value"}'
                />
              </div>

              <button
                onClick={executeTool}
                disabled={executing}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {executing ? '执行中...' : '执行工具'}
              </button>

              {toolResult && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">执行结果</h4>
                  <div
                    className={`p-3 rounded-lg ${
                      toolResult.success
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <pre className="text-sm overflow-auto max-h-64">
                      {JSON.stringify(toolResult, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedTool.inputSchema && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">参数 Schema</h4>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <pre className="text-xs overflow-auto max-h-48">
                      {JSON.stringify(selectedTool.inputSchema, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">请选择一个工具</p>
          )}
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">使用说明</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>1. 从左侧选择一个设备</li>
          <li>2. 从中间选择一个服务和工具</li>
          <li>3. 在右侧输入工具参数（JSON 格式）</li>
          <li>4. 点击"执行工具"按钮测试工具调用</li>
          <li>5. 查看执行结果和参数 Schema</li>
        </ul>
      </div>
    </div>
  );
}
