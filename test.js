'use strict'
const cote = require('cote')
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
    client.send({ type: 'new-msg', msg: { type: "test" } }, (err) => {
        if(err) console.error(err)
        else {
            console.log('posted message');
            client.send({
                type: 'dump-msgs',
                opts: {
                    showPvt: true,
                    showCnt: false,
                    showAth: false,
                },
            }, (err, msgs) => {
                if(err) u.showErr(err)
                else u.showMsg(msgs)
            })
        }
    })
}

main()
