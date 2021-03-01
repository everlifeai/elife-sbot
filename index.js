'use strict'
const path = require('path')
const ssbKeys = require('ssb-keys')
const pull = require('pull-stream')
const u = require('@elife/utils')

const sbot = require('./sbot')
const microservices = require('./microservices')


/*      understand/
 * This is the main entry point where we start.
 *
 *      outcome/
 * Load any configuration information, start scuttlebot, the
 * microservice, and poll for feed updates.
 */
function main() {
    let conf = loadConfig()
    sbot.start(conf, (err, sbot_, feed) => {
        if(err) u.showErr(err)
        else {
            microservices.start(conf, sbot_, feed.id)
            pollForFeedUpdates(conf, sbot_)
        }
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
        cfg.SSB_PORT = u.adjustPort(8997)
    }

    if(process.env.SSB_WS_PORT) {
        cfg.SSB_WS_PORT = process.env.SSB_WS_PORT
    } else {
        cfg.SSB_WS_PORT = u.adjustPort(8996)
    }

    if(process.env.SSB_FOLDER) {
        cfg.SSB_FOLDER = process.env.SSB_FOLDER
    } else {
        cfg.SSB_FOLDER = u.dataLoc()
    }

    if(process.env.SSB_HOST){
        cfg.SSB_HOST = process.env.SSB_HOST
    }

    return cfg;
}

/*      understand/
 * Setting `live:true` keeps the channel open and new messages
 * continually pouring in.
 *
 *      outcome/
 * Send any feed update messages to registered feed handlers
 */
function pollForFeedUpdates(conf, sbot_) {
    pull(
        sbot_.createFeedStream({live:true,old:false}),
        pull.drain(microservices.sendToFeedHandlers)
    )
}

main()
