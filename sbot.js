'use strict'

const path = require('path')
const fs = require('fs')
const ssbKeys = require('ssb-keys')
const u = require('@elife/utils')


const createSbot = require('secret-stack')()
  .use(require('ssb-db'))
  .use(require('ssb-conn'))
  .use(require('ssb-lan'))
  .use(require('ssb-logging'))
  .use(require('ssb-master'))
  .use(require('ssb-no-auth'))
  .use(require('ssb-replicate'))
  .use(require('ssb-unix-socket'))
  .use(require('ssb-friends')) // not strictly required, but helps ssb-conn a lot
  .use(require('ssb-blobs'))
  .use(require('ssb-backlinks'))
  .use(
    require('ssb-social-index')({
      namespace: 'about',
      type: 'about',
      destField: 'about'
    })
  )
  .use(require('ssb-private'))
  .use(require('ssb-room/tunnel/client'))
  .use(require('ssb-dht-invite'))
  .use(require('ssb-invite'))
  .use(require('ssb-query'))
  .use(require('ssb-search'))
  .use(require('ssb-ws'))
  .use(require('ssb-tags'))
  .use(require('ssb-ebt'))

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
    let sbotFolder = config["SSB_FOLDER"]

    if(!port) {
        cb(`Set the ssb-port in the configuration`)
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
        let keys = ssbKeys.loadOrCreateSync(u.secretFile())

        let appName = `everlife_${config.node_num}`

        let cfg = require('ssb-config/inject')(appName, {
            appKey: appKey,
            port : port,
            keys: keys,
            path: sbotFolder,
            allowPrivate: true,
            local: false,
            caps: {
                shs: appKey
            },
            friends: { // not using ssb-friends (sbot/contacts fixes hops at 2, so this setting won't do anything)
                dunbar: 150,
                hops: 2 // down from 3
            }
        })

        if (!cfg.gossip) cfg.gossip = {}
        cfg.gossip.autoPopulate = true


        const pubkey = keys.id.slice(1).replace(`.${keys.curve}`, '')
        const socketPath = path.join(cfg.path, 'socket')
        cfg.connections.incoming.unix = [{ scope: 'device', transform: 'noauth' }]
        cfg.remote = `unix:${socketPath}:~noauth:${pubkey}`
        cfg.connections.incoming.tunnel = [{ scope: 'public', transform: 'shs' }]
        cfg.connections.outgoing.tunnel = [{ transform: 'shs' }]

        // Support DHT invites (only as a client, for now)
        cfg.connections.outgoing.dht = [{ transform: 'shs' }]


        let sbot = createSbot(cfg)
        sbot.whoami((err, feed) => {
            if(err) cb(`Failed starting scuttlebot server ${err}`)
            else {
                let manifest = sbot.getManifest()
                let manifestf = path.join(cfg.path, 'manifest.json')
                fs.writeFileSync(manifestf, JSON.stringify(manifest))

                cb(null, sbot, feed)
            }
        })
    }
}
