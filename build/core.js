var EventEmitter, EventServer, WsServer, config, l,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

WsServer = require("ws").Server;

EventEmitter = require("events").EventEmitter;

l = require("./log");

config = require("./config");

EventServer = (function(superClass) {
  extend(EventServer, superClass);

  function EventServer() {
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
    this.server.on("connection", (function(_this) {
      return function(connection) {
        var processor;
        l.log("New connection");
        processor = {
          connection: connection,
          type: "unknown"
        };
        _this.processors.push(processor);
        connection.on("message", function(data) {
          data = _this.formatMessage(data);
          if ((data != null) && (data.messageType != null) && (data.params != null)) {
            switch (data.messageType) {
              case "event":
                l.log("Event:" + data.params.event);
                return _this.broadcast(processor, {
                  messageType: "event",
                  params: {
                    event: data.params.event,
                    params: data.params.params
                  }
                });
              case "init":
                return processor.type = data.params.type;
              default:
                return l.error("Invalid messageType: " + data.messageType);
            }
          }
        });
        return connection.on("close", function() {
          return _this.processors.splice(_this.processors.indexOf(processor), 1);
        });
      };
    })(this));
  }

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
