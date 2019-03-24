'use strict'
const cote = require('cote')({statusLogsEnabled:false})
const u = require('elife-utils')

const client = new cote.Requester({
    name: 'Test SSB Client',
    key: 'everlife-ssb-svc',
})

/*      outcome/
 * Exercise the ssb service by calling various api endpoints
 * TODO: Add test cases for all endpoints
 */
function main() {
    let args = process.argv
    if(args.length == 2) showHelp()
    let cmd = args[2]
    if(cmd == 'dump') dump(args[3])
    if(cmd == 'dump-type') dump_type(args[3])
    if(cmd == 'msg') add(args[3])
    if(cmd == 'invite') invite(args[3])
    if(cmd == 'join') join(args[3])
    if(cmd == 'file-blob') fileBlob(args[3])
    if(cmd == 'array-blob') arrayBlob(args[3])
    if(cmd == 'dump-blob') dumpBlob(args[3])
}

function showHelp() {
    u.showMsg(`
Help:
    dump <id>:   show feed <for user>
    dump-type type: show feed of messages of type
    msg txt: add message with text
    invite: create invite
    join invite: use the invite to join a pub
    file-blob path: Create blob from file
    array-blob [a,r,r,a,y]: Create blob from array
    dump-blob hash: Dump blob
`)
}

function dump_type(type_) {
    let req = {
        type: 'msg-by-type',
        msgtype: type_,
    }

    client.send(req, (err, msgs) => {
        if(err) u.showErr(err)
        else u.showMsg(msgs)

        process.exit()
    })
}


function dump(user) {
    let req = {
        type: 'dump-msgs',
        opts: {
            showPvt: true,
            showCnt: false,
            showAth: false,
        },
    }
    if(user) req.user = user
    client.send(req, (err, msgs) => {
        if(err) u.showErr(err)
        else u.showMsg(msgs)

        process.exit()
    })
}

function add(txt) {
    client.send({ type: 'new-msg', msg: { type: "test", txt:txt } }, (err) => {
        if(err) u.showErr(err)
        else u.showMsg('Ok')

        process.exit()
    })
}

function invite() {
    client.send({ type: 'create-invite' }, (err, inv) => {
        if(err) u.showErr(err)
        else u.showMsg(inv)

        process.exit()
    })
}

function join(inv) {
    client.send({ type: 'accept-invite', invite:inv }, (err) => {
        if(err) u.showErr(err)
        else u.showMsg('Ok')

        process.exit()
    })
}

function fileBlob(p) {
    client.send({ type: 'blob-save-file', filePath: p }, (err, hash) => {
        if(err) u.showErr(err)
        else u.showMsg(`Blob created: ${hash}`)
    })
}

function arrayBlob(a) {
    let arr = JSON.parse(a)
    client.send({ type: 'blob-save-array', bytes: arr }, (err, hash) => {
        if(err) u.showErr(err)
        else u.showMsg(`Blob created: ${hash}`)
    })
}

function dumpBlob(h) {
    client.send({ type: 'blob-load', hash: h }, (err, blob) => {
        if(err) u.showErr(err)
        else u.showMsg(blob)
    })
}

main()
