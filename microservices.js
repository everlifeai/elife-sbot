'use strict'
const cote = require('cote')
const pull = require('pull-stream')


/*      understand/
 * We hold a reference to the sbot (and our id) so we can access it for
 * various the various services we provide.
 * TODO: Replace this global with a closure
 */
let sbot
let ssbid

module.exports = {
    start: start,
    sendToFeedHandlers: sendToFeedHandlers,
}


function start(config, sbot_, ssbid_) {
    sbot = sbot_
    ssbid = ssbid_

    /*      understand/
     * The skill microservice (partitioned by key `everlife-ssb-svc` to
     * prevent conflicting with other services.
     */
    const sbotSvc = new cote.Responder({
        name: 'Everlife SSB Service',
        key: 'everlife-ssb-svc',
    })


    sbotSvc.on('new-msg', handleNewMsg)
    sbotSvc.on('new-pvt-msg', handleNewPvtMsg)
    sbotSvc.on('new-pvt-log', handleNewPvtLog)
    sbotSvc.on('dump-msgs', handleDumpMsgs)

    sbotSvc.on('create-user', handleCreateUser)
    sbotSvc.on('secret-key', handleGetSecretKey)

    sbotSvc.on('create-invite', handleCreateInvite)
    sbotSvc.on('accept-invite', handleAcceptInvite)

    sbotSvc.on('register-feed-handler', registerFeedHandler)

    sbotSvc.on('follow-user', handleFollowUser)
    sbotSvc.on('unfollow-user', handleUnFollowUser)

    sbotSvc.on('avatar-id', handleAvatarId)
}

function handleNewMsg(req, cb) {
    let id

    if(req.user) id = req.user
    else id = sbot.id

    if(!req.msg) {
        cb(`No msg found to add`)
        return
    }
    if(!req.msg.type) {
        cb(`Msg must have a type to add ${req.msg}`)
        return
    }

    sbot.identities.publishAs({ id:id, content:req.msg, private:false }, cb)
}
function handleNewPvtMsg(req, cb) {
    let id

    if(req.user) id = req.user
    else id = sbot.id

    if(!req.msg) {
        cb(`No msg found to add`)
        return
    }
    if(!req.msg.type) {
        cb(`Msg must have a type to add ${req.msg}`)
        return
    }
    if(!req.to || req.to == id) {
        cb(`No recipient found to send message to`)
        return
    }

    req.msg.recps = [ req.to, id ]

    sbot.identities.publishAs({ id:id, content:req.msg, private:true }, cb)
}
function handleNewPvtLog(req, cb) {
    let id

    if(req.user) id = req.user
    else id = sbot.id

    if(!req.msg) {
        cb(`No msg found to add`)
        return
    }
    if(!req.msg.type) {
        cb(`Msg must have a type to add ${req.msg}`)
        return
    }

    req.msg.recps = [ id ]

    sbot.identities.publishAs({ id:id, content:req.msg, private:true }, cb)
}
function handleDumpMsgs(req, cb) {
    let id = req.user
    dumpMsgs(id, req.opts, cb)
}

/*      outcome/
 * Dump all the messages in the user's feed. Useful for debugging.
 * Takes the following paramters:
 *  {
 *      showPvt: true,  <-- decrypt private messages
 *      showCnt: true,  <-- filter only the content
 *      showAth: true,  <-- filter only the author/message type
 * If
 * `showPvt` is set will decrypt private messages while dumping. If
 * `showCnt` is set will filter only the content.
 */
function dumpMsgs(id, opts, cb) {
    if(!opts) opts = {};
    let feedOpts = { private : opts.showPvt }
    let cmd = sbot.createFeedStream

    if(id) {
        feedOpts.id = id
        cmd = sbot.createUserStream
    }

    if(opts.showCnt) {
        pull(
            cmd(feedOpts),
            pull.map(msg => msg.value.content),
            pull.collect(cb)
        )
    } else if(opts.showAth) {
        pull(
            cmd(feedOpts),
            pull.map(msg => { return { author: msg.value.author, type: msg.value.content.type} }),
            pull.collect(cb)
        )
    } else {
        pull(
            cmd(feedOpts),
            pull.collect(cb)
        )
    }
}

/*      outcome/
 * Create a new user managed by our avatar (acting as a 'host'), and
 * follow it so it replicates across our hubs.
 */
function handleCreateUser(req, cb) {
    sbot.identities.create((err,id) => {
        if(err) cb(err)
        else {
            sbot.publish({
                type: 'contact',
                following: true,
                autofollow: true,
                contact: id,
            }, (err,msg) => {
                cb(err, id);
            })
        }
    })
}

// TODO: WARNING: This is very insecure! :WARNING
// We need to think this use case out carefully
function handleGetSecretKey(req, cb) {
    if(!req.user) {
        cb(`No user provided`)
        return
    }

    sbot.identities.secret(req.user, (err,ids) => {
        if(err) cb(err)
        else cb(null,ids)
    })
}

function handleCreateInvite(req, cb) {
    // TODO: unlimited invite?
    sbot.invite.create(Number.MAX_VALUE, (err, inv) => {
        if(err) cb(err)
        else cb(null,inv)
    })
}

function handleAcceptInvite(req, cb) {
    if(!req.invite) {
        cb(`No invite found`)
        return
    }
    sbot.invite.accept(req.invite, cb);
}

let feedHandlerRegistry = []
function registerFeedHandler(req, cb) {
    if(!req.mskey || !req.mstype) cb(`mskey & mstype needed to register feed handler`)
    else {
        let client = new cote.Requester({
            name: `SSB Feed -> ${req.mskey}`,
            key: req.mskey,
        })
        feedHandlerRegistry.push({client: client, mstype: req.mstype})
        cb(null, ssbid)
    }
}

function sendToFeedHandlers(msg) {
    send_to_handler_1(0)

    function send_to_handler_1(ndx) {
        if(ndx >= feedHandlerRegistry.length) return
        let fh = feedHandlerRegistry[ndx]
        fh.client.send({
            type: fh.mstype,
            msg: msg,
        })
    }
}

function handleFollowUser(req,cb){
    if(!req.userid) cb('No user id found')

    sbot.publish({
        type: 'contact',
        contact: req.userid,
        following: true 
      }, cb)
}

function handleUnFollowUser(req,cb){
    if(!req.userid) cb('No user id found')

    sbot.publish({
        type: 'contact',
        contact: req.userid,
        following: false 
      }, cb)
}

function handleAvatarId(req, cb) {
    cb(null, sbot.id)
}
