'use strict'
const path = require('path')
const ssbKeys = require('ssb-keys')
const u = require('elife-utils')

const sbot = require('./sbot')
const microservices = require('./microservices')


/*      understand/
 * This is the main entry point where we start.
 *
 *      outcome/
 * Load any configuration information, start scuttlebot the
 * microservice.
 */
function main() {
    let conf = loadConfig()
    sbot.start(conf, (err, sbot) => {
        if(err) u.showErr(err)
        else microservices.start(conf, sbot)
    })
}

/*      outcome/
 * Load the configuration (from environment variables) or defaults
 */
function loadConfig() {
    let cfg = {};

    if(process.env.SSB_PORT) {
        cfg.SSB_PORT = process.env.SSB_PORT
    } else {
        cfg.SSB_PORT = "8997"
    }

    if(process.env.SSB_WS_PORT) {
        cfg.SSB_WS_PORT = process.env.SSB_WS_PORT
    } else {
        cfg.SSB_WS_PORT = "8996"
    }


    if(process.env.SSB_FOLDER) {
        cfg.SSB_FOLDER = process.env.SSB_FOLDER
    } else {
        cfg.SSB_FOLDER = "ssb"
    }

    return cfg;
}

main()
