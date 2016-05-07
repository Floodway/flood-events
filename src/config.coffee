env = process.env
utils = require("./utils")
config =

  port: env.port ? 3000

  connectMirrors: if env.mirros? then  env.mirrors.split(";") else []

  requireAuth: env.requireAuth == "true" ? true

  authSecret: env.secret ? utils.generateSecret()
  


module.exports = config