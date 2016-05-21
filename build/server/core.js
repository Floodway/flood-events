var EventEmitter, EventServer, WsServer, config, l,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

WsServer = require("ws").Server;

EventEmitter = require("events").EventEmitter;

l = require("./../log");

config = require("./config");

EventServer = (function(superClass) {
  extend(EventServer, superClass);

  function EventServer(callback) {
    EventServer.__super__.constructor.call(this);
    l.log("Constructing Server...");
    this.server = new WsServer({
      port: config.port,
      verifyClient: function(info, callback) {
        if (!config.requireAuth) {
          l.success("Client accepted. No secret required.");
          callback(true);
          return;
        }
        if (info.req.headers["flood-secret"] === config.authSecret) {
          l.success("Client accepted. Secret  matched");
          callback(true);
          return;
        }
        callback(false, 403, "authenticationRequired");
        return l.error("Client denied. Wrong authentication info");
      }
    });
    l.log("Server listening on port: " + config.port);
    this.processors = [];
    this.listeners = {};
    callback();
  }

  EventServer.prototype.handleConnection = function(connection) {
    var processor;
    l.log("New connection");
    processor = {
      connection: connection,
      type: "unknown"
    };
    connection.on("message", (function(_this) {
      return function(data) {
        var i, len, listener, ref, results;
        data = _this.formatMessage(data);
        if ((data != null) && (data.messageType != null) && (data.params != null)) {
          console.log(data);
          switch (data.messageType != null) {
            case "event":
              if (_this.listeners[data.params.event] != null) {
                ref = _this.listeners[data.params.event];
                results = [];
                for (i = 0, len = ref.length; i < len; i++) {
                  listener = ref[i];
                  if (listener !== connection) {
                    results.push(listener.send(JSON.stringify({
                      messageType: "event",
                      params: {
                        event: data.params.event,
                        params: data.params.params
                      }
                    })));
                  } else {
                    results.push(void 0);
                  }
                }
                return results;
              }
              break;
            case "init":
              return processor.type = data.params.type;
            case "registerListener":
              if (_this.listeners[data.params.event] == null) {
                _this.listeners[data.params.event] = [];
              }
              return _this.listeners[data.params.event].push(connection);
            case "removeListener":
              if (_this.listeners[data.params.event] != null) {
                _this.listeners[data.params.event] = _this.listeners[data.params.event].filter(function(item) {
                  return item !== connection;
                });
                if (_this.listeners[data.params.event].length === 0) {
                  return delete _this.listeners[data.params.event];
                }
              }
              break;
            default:
              return l.error("Invalid messageType: " + data.messageType);
          }
        }
      };
    })(this));
    return connection.on("close", (function(_this) {
      return function() {
        return _this.processors.splice(processors.indexOf(processor), 1);
      };
    })(this));
  };

  EventServer.prototype.broadcast = function(p, message) {
    return this.processors.map(function(processor) {
      if (processor !== p) {
        return processor.connection.send(JSON.stringify(message));
      }
    });
  };

  EventServer.prototype.formatMessage = function(message) {
    var data, e, error;
    try {
      data = JSON.parse(message.toString());
    } catch (error) {
      e = error;
      return null;
    }
    return data;
  };

  return EventServer;

})(EventEmitter);

module.exports = EventServer;
