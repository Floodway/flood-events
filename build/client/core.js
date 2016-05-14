var FloodEventEmitter, WebSocket, l, utils;

WebSocket = require("ws");

utils = require("./../utils");

l = require("./../log");

FloodEventEmitter = (function() {
  function FloodEventEmitter(url, secret, autoConnect, log) {
    this.url = url;
    this.secret = secret;
    if (autoConnect == null) {
      autoConnect = true;
    }
    this.log = log != null ? log : true;
    this.listeners = {};
    if (autoConnect) {
      this.connect();
    }
  }

  FloodEventEmitter.prototype.connect = function() {
    this.client = new WebSocket(this.url);
    this.client.on("message", (function(_this) {
      return function(message) {
        var data, e, error;
        try {
          data = JSON.parse(message.toString());
        } catch (error) {
          e = error;
          l.error("Invalid message from Event server: " + (message.toString()));
        }
        if (data != null) {
          return _this.processMessage(data);
        }
      };
    })(this));
    this.client.on("error", (function(_this) {
      return function(err) {
        return l.error("Event socket error: ", err);
      };
    })(this));
    return this.client.on("open", (function(_this) {
      return function() {
        if (_this.log) {
          l.success("Connection to event server instantiated");
        }
        _this.emit("ready", null, true);
        return _this.sendData({
          messageType: "init",
          params: {
            type: "client"
          }
        });
      };
    })(this));
  };

  FloodEventEmitter.prototype.sendData = function(event) {
    var e, error;
    try {
      return this.client.send(JSON.stringify(event));
    } catch (error) {
      e = error;
      return l.error("Could not send event: " + event.params.event + ". Not JSON serializable!", e);
    }
  };

  FloodEventEmitter.prototype.processMessage = function(data) {
    if ((data.messageType != null) && (data.params != null)) {
      switch (data.messageType) {
        case "event":
          if (this.log) {
            l.log("Event: " + data.params.event);
          }
          return this.emitEvent(data.params.event, data.params.params);
        default:
          return this.removeListener(data.params.event);
      }
    }
  };

  FloodEventEmitter.prototype.emitEvent = function(name, params) {
    var i, len, listener, ref, results;
    if (this.listeners[name] != null) {
      ref = this.listeners[name];
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        listener = ref[i];
        results.push(listener.callback(params));
      }
      return results;
    }
  };

  FloodEventEmitter.prototype.removeListener = function(name) {
    return this.sendData({
      messageType: "removeListener",
      params: {
        event: name
      }
    });
  };

  FloodEventEmitter.prototype.emit = function(name, params, local) {
    if (local == null) {
      local = false;
    }
    if (!local) {
      this.sendData({
        messageType: "event",
        params: {
          event: name,
          params: params
        }
      });
    }
    return this.emitEvent(name, params);
  };

  FloodEventEmitter.prototype.once = function(event, callback, local) {
    return this.on(event, function(params) {
      this.off(event, callback);
      return callback(params);
    }, local);
  };

  FloodEventEmitter.prototype.on = function(event, callback, local) {
    var remove;
    if (local == null) {
      local = false;
    }
    if (this.listeners[event] == null) {
      if (!local) {
        this.sendData({
          messageType: "registerListener",
          params: {
            event: event
          }
        });
      }
      this.listeners[event] = [];
    }
    this.listeners[event].push({
      callback: callback
    });
    remove = (function(_this) {
      return function() {
        return _this.off(event, callback);
      };
    })(this);
    return remove;
  };

  FloodEventEmitter.prototype.off = function(event, callback) {
    if (this.listeners[event] != null) {
      this.listeners[event] = this.listeners[event].filter(function(listener) {
        return listener.callback !== callback;
      });
      if (this.listeners[event].length === 0) {
        this.removeListener(event);
        return delete this.listeners[event];
      }
    }
  };

  return FloodEventEmitter;

})();

module.exports = FloodEventEmitter;
