var config, env, ref, ref1, ref2, utils;

env = process.env;

utils = require("./utils");

config = {
  port: (ref = env.port) != null ? ref : 3000,
  connectMirrors: env.mirros != null ? env.mirrors.split(";") : [],
  requireAuth: (ref1 = env.requireAuth === "true") != null ? ref1 : true,
  authSecret: (ref2 = env.secret) != null ? ref2 : utils.generateSecret()
};

module.exports = config;
