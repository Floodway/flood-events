WebSocket = require("ws")
utils = require("./../utils")
l =require("./../log")

class FloodEventEmitter

    constructor: (@url,@secret,autoConnect=true,@log=true) ->

      @listeners = {}

      if autoConnect then @connect()

    connect: ->

        @client = new WebSocket(@url)

        @client.on("message",(message) =>
          try
            data = JSON.parse(message.toString())
          catch e
            l.error("Invalid message from Event server: #{ message.toString() }")


          if data? then @processMessage(data)

        )
      
        @client.on("error", (err) =>
          l.error("Event socket error: ",err)
        )

        @client.on("open", =>

          if @log then l.success("Connection to event server instantiated")

          @emit("ready",null,true)

          @sendData(
            messageType: "init"
            params:
              type: "client"
          )
          
          

        )


    sendData: (event) ->

      try
        @client.send(JSON.stringify(event))
      catch e

        l.error("Could not send event: #{ event.params.event  }. Not JSON serializable!",e)
  
    processMessage: (data) ->
      
      if data.messageType? and data.params?
        
        switch data.messageType

          when "event"

            if @log then l.log("Event: #{  data.params.event}")

            @emitEvent(data.params.event,data.params.params)

          else
            # This event should not have been passed here!

            @removeListener(data.params.event)


    emitEvent: (name,params) ->

      if @listeners[name]?

        for listener in @listeners[name]

          listener.callback(params)

    removeListener: (name) ->

      @sendData(
        messageType: "removeListener"
        params:
          event: name
      )

          
    emit: (name,params,local=false) ->

      if not local
        @sendData(

          messageType: "event"
          params:
            event: name
            params: params

        )

      @emitEvent(name,params)
    
    once: (event,callback,local) ->
      
      @on(event,(params) ->
        
        @off(event,callback)
        callback(params)
        
      ,local)
      
      
    on: (event,callback,local=false) ->


      if not @listeners[event]?

        if not local
          @sendData(
            messageType: "registerListener"
            params:
              event: event
          )


        @listeners[event] = []



      @listeners[event].push(
        callback: callback
      )

      remove = =>

        @off(event,callback)

      return  remove

    off: (event,callback) ->

      if @listeners[event]?

        @listeners[event] = @listeners[event].filter( (listener) ->
          return listener.callback != callback
        )

        if @listeners[event].length == 0

          @removeListener(event)

          delete @listeners[event]

module.exports = FloodEventEmitter
