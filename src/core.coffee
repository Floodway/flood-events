WsServer = require("ws").Server 
EventEmitter = require("events").EventEmitter
l = require("./log")
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

    @processors = []
    
    @server.on("connection", (connection) =>

      l.log("New connection")

      processor =
        connection: connection
        type: "unknown"

      @processors.push(processor)
      
      connection.on("message", (data) =>
          
        data = @formatMessage(data)
        
        if data? and data.messageType? and data.params?
          
          switch data.messageType 
            
            when "event" 
              l.log("Event:"+data.params.event)
              @broadcast(processor,
                messageType: "event"
                params:
                  event: data.params.event # The event name
                  params: data.params.params # Any parameters
              )

            when "init"

              processor.type  = data.params.type
              
              
            
            else 
            
              l.error("Invalid messageType: #{ data.messageType }")
            
      
      )
      
      connection.on("close", =>
        @processors.splice(@processors.indexOf(processor),1)
      )
      
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
    
    
    