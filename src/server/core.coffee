WsServer = require("ws").Server 
EventEmitter = require("events").EventEmitter
l = require("./../log")
config = require("./config")

class EventServer extends EventEmitter
  
  constructor: ->

    l.log("Constructing Server...")

    @server = new WsServer(
      port: config.port

      verifyClient: (info,callback) ->

        if not config.requireAuth
          l.success("Client accepted. No secret required.")
          callback(true)
          return
  
        if info.req.headers["flood-secret"] == config.authSecret
          l.success("Client accepted. Secret  matched")
          callback(true)
          return
  
        callback(false,403,"authenticationRequired")
        l.error("Client denied. Wrong authentication info")
    )

    l.log("Server listening on port: #{ config.port }")
  
    @emit("ready")
    
    @processors = []
    @listeners = {}


  handleConnection: (connection) ->

    l.log("New connection")

    processor =

      connection: connection
      type: "unknown"

    connection.on("message",(data) =>

      data = @formatMessage(data)

      if data? and data.messageType? and data.params?

        console.log data

        switch data.messageType?

          when "event"

            if @listeners[data.params.event]?

              for listener in @listeners[data.params.event]
                if listener != connection
                  listener.send(JSON.stringify(
                    messageType: "event"
                    params:
                      event: data.params.event
                      params: data.params.params
                  ))

          when "init"

            processor.type = data.params.type

          when "registerListener"


            if not @listeners[data.params.event]?

              @listeners[data.params.event] = []

            @listeners[data.params.event].push(connection)



          when "removeListener"

            if @listeners[data.params.event]?

              @listeners[data.params.event] = @listeners[data.params.event].filter((item) ->
                return item != connection
              )


              if @listeners[data.params.event].length == 0

                delete @listeners[data.params.event]

          else

            l.error("Invalid messageType: #{ data.messageType }")

    )

    connection.on("close", =>
      @processors.splice(processors.indexOf(processor),1)

    )

  broadcast: (p,message) ->

    @processors.map((processor) ->
      # Don't send back to origin
      if processor != p
        processor.connection.send(JSON.stringify(message))
    )

  formatMessage: (message) ->
    
    try 
      data = JSON.parse(message.toString())
      
    catch e 
      
      return null 
    
    return data

module.exports = EventServer
    
    
    