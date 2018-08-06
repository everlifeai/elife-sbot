'use strict'
const path = require('path')
const ssbKeys = require('ssb-keys')
const u = require('elife-utils')


const createSbot = require('scuttlebot')
                   .use(require('scuttlebot/plugins/master'))
                   .use(require('scuttlebot/plugins/gossip'))
                   .use(require('scuttlebot/plugins/replicate'))
                   .use(require('ssb-friends'))
                   .use(require('ssb-blobs'))
                   .use(require('scuttlebot/plugins/invite'))
                   .use(require('scuttlebot/plugins/local'))
                   .use(require('scuttlebot/plugins/logging'))
                   .use(require('ssb-query'))
                   .use(require('ssb-links'))
                   .use(require('ssb-ws'))
                   .use(require('ssb-ebt'))
                   .use(require('ssb-identities'))


module.exports = {
    start: start,
}

/*      understand/
 * This is the "application key" what this means is our app will be
 * isolated from other scuttlebuts on the same network that do not use
 * the same key.
 */
const appKey = new Buffer('P6EGPtCNW7irtdeIk+vRVzVbWOlctUKJuce1IZkO2N4=', 'base64');

/*      outcome/
 * We start scuttlebot using the configuration port and database path
 * provided.
 */
function start(config, cb) {
    let port = config['SSB_PORT']
    let ws_port = config['SSB_WS_PORT']
    let sbotFolder = config["SSB_FOLDER"]

    if(!sbotFolder) {
        cb(`Scuttlebot data folder not set`)
        return
    }

    if(!port || !ws_port) {
        cb(`Set the ssb-port and ws-port in the configuration`)
        return
    }

    if(!sbotFolder || !(sbotFolder.trim())) {
        cb(`Did not find configuration folder to load data`)
        return
    }

    sbotFolder = path.join(sbotFolder, "__ssb")

    u.ensureExists(sbotFolder, err => {
        if(err) cb(`Failed to create scuttlebot data folder ${err}`)
        else {
            start_sbot_1()
        }
    })

    function start_sbot_1() {
        let secret = path.join(sbotFolder, 'nucleus')
        let keys = ssbKeys.loadOrCreateSync(secret)

        let cfg = {
            port : port,
            ws : { port : ws_port },
            keys: keys,
            path: sbotFolder,
            allowPrivate: true,
            //appKey: appKey,
        }

        let sbot = createSbot(cfg)
        sbot.whoami((err, feed) => {
            if(err) cb(`Failed starting scuttlebot server ${err}`)
            else {
                cb(null, sbot, feed)
            }
        })
    }
}
