/**
 * 生成注入到 iframe 中的 View 侧 SDK 脚本
 * 对标 MCP Apps 规范的 App 类
 *
 * 提供：
 * - App.connect() 与 Host 建立通信
 * - app.callServerTool() 主动调用工具
 * - app.readResource() 读取资源
 * - 事件回调：ontoolinput / ontoolresult / onhostcontextchanged / onteardown
 * - 兼容层：window.MiniAppAPI（向后兼容）
 */

export function generateViewSDKScript(): string {
  return `
<script>
(function() {
  'use strict';

  // === JSON-RPC 通信层 ===
  var _requestId = 0;
  var _pendingRequests = {};

  function sendRequest(method, params) {
    return new Promise(function(resolve, reject) {
      var id = ++_requestId;
      _pendingRequests[id] = { resolve: resolve, reject: reject };

      window.parent.postMessage({
        jsonrpc: '2.0',
        id: id,
        method: method,
        params: params || {}
      }, '*');

      setTimeout(function() {
        if (_pendingRequests[id]) {
          delete _pendingRequests[id];
          reject(new Error('Request timeout: ' + method));
        }
      }, 30000);
    });
  }

  function sendNotification(method, params) {
    window.parent.postMessage({
      jsonrpc: '2.0',
      method: method,
      params: params || {}
    }, '*');
  }

  function sendResponse(id, result, error) {
    var msg = { jsonrpc: '2.0', id: id };
    if (error) {
      msg.error = { code: -32603, message: error };
    } else {
      msg.result = result || {};
    }
    window.parent.postMessage(msg, '*');
  }

  // === Console 代理 + 错误捕获 ===
  var _origConsole = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  ['log', 'warn', 'error', 'info'].forEach(function(level) {
    console[level] = function() {
      _origConsole[level].apply(console, arguments);
      var args = [];
      for (var i = 0; i < arguments.length; i++) {
        try { args.push(typeof arguments[i] === 'object' ? JSON.stringify(arguments[i]) : String(arguments[i])); }
        catch(e) { args.push('[unserializable]'); }
      }
      window.parent.postMessage({
        jsonrpc: '2.0',
        method: 'console',
        params: { level: level, args: args, timestamp: Date.now() }
      }, '*');
    };
  });

  window.onerror = function(msg, source, line, col, err) {
    window.parent.postMessage({
      jsonrpc: '2.0',
      method: 'console',
      params: {
        level: 'error',
        args: ['[Runtime Error] ' + msg + ' (line:' + line + ', col:' + col + ')' + (err && err.stack ? '\\n' + err.stack : '')],
        timestamp: Date.now()
      }
    }, '*');
  };

  window.onunhandledrejection = function(event) {
    var reason = event.reason;
    var msg = reason instanceof Error ? reason.message + '\\n' + reason.stack : String(reason);
    window.parent.postMessage({
      jsonrpc: '2.0',
      method: 'console',
      params: { level: 'error', args: ['[Unhandled Rejection] ' + msg], timestamp: Date.now() }
    }, '*');
  };

  // === App 类 ===
  function App(info, capabilities, options) {
    this.info = info || { name: 'MiniApp', version: '1.0.0' };
    this.capabilities = capabilities || {};
    this.options = options || {};
    this.connected = false;
    this.hostContext = {};

    // 事件回调
    this.ontoolinput = null;
    this.ontoolinputpartial = null;
    this.ontoolresult = null;
    this.ontoolcancelled = null;
    this.onhostcontextchanged = null;
    this.onteardown = null;
  }

  App.prototype.connect = function() {
    var self = this;

    // 监听来自 Host 的消息
    window.addEventListener('message', function(event) {
      var data = event.data;
      if (!data || data.jsonrpc !== '2.0') return;

      // Host 的响应
      if (data.id !== undefined && !data.method) {
        var pending = _pendingRequests[data.id];
        if (pending) {
          delete _pendingRequests[data.id];
          if (data.error) {
            pending.reject(new Error(data.error.message));
          } else {
            pending.resolve(data.result);
          }
        }
        return;
      }

      // Host 的通知/请求
      if (data.method) {
        self._handleHostMessage(data);
      }
    });

    // 发送 initialize 请求
    return sendRequest('initialize', {
      viewInfo: this.info,
      capabilities: this.capabilities
    }).then(function(result) {
      self.connected = true;
      self.hostContext = (result && result.hostContext) || {};
      return result;
    });
  };

  App.prototype._handleHostMessage = function(msg) {
    var method = msg.method;
    var params = msg.params || {};

    switch (method) {
      case 'notifications/toolInput':
        if (this.ontoolinput) this.ontoolinput(params);
        break;
      case 'notifications/toolInputPartial':
        if (this.ontoolinputpartial) this.ontoolinputpartial(params);
        break;
      case 'notifications/toolResult':
        if (this.ontoolresult) this.ontoolresult(params);
        break;
      case 'notifications/toolCancelled':
        if (this.ontoolcancelled) this.ontoolcancelled(params);
        break;
      case 'notifications/hostContextChanged':
        this.hostContext = params;
        if (this.onhostcontextchanged) this.onhostcontextchanged(params);
        break;
      case 'notifications/teardown':
        var result = {};
        if (this.onteardown) {
          var ret = this.onteardown();
          if (ret && typeof ret.then === 'function') {
            ret.then(function(r) {
              if (msg.id !== undefined) sendResponse(msg.id, r || {});
            });
            return;
          }
          result = ret || {};
        }
        if (msg.id !== undefined) sendResponse(msg.id, result);
        break;
      default:
        if (msg.id !== undefined) {
          sendResponse(msg.id, null, 'Unknown method: ' + method);
        }
    }
  };

  App.prototype.callServerTool = function(name, args) {
    return sendRequest('tools/call', { name: name, arguments: args || {} });
  };

  App.prototype.readResource = function(uri) {
    return sendRequest('resources/read', { uri: uri });
  };

  App.prototype.openLink = function(url) {
    return sendRequest('openLink', { url: url });
  };

  App.prototype.sendMessage = function(role, content) {
    return sendRequest('sendMessage', { role: role, content: content });
  };

  App.prototype.requestResize = function(width, height) {
    sendNotification('sizeChanged', { width: width, height: height });
  };

  // 暴露到全局
  window.App = App;
})();
</script>
`;
}
