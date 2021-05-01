'use strict'
const path = require('path')
const BoxStream = require('pull-box-stream')
const File = require('pull-file')
const pull = require('pull-stream')
const toPull = require('stream-to-pull-stream')
const crypto = require('crypto')
const zeros = new Buffer(24); zeros.fill(0)
const fs = require('fs')
const os = require('os')
const shortid = require('shortid')

function Hash (cb) {
  let hash = crypto.createHash('sha256')
  let buffers = []
  let hasher = pull.drain(function (data) {
    data = 'string' === typeof data ? new Buffer(data) : data
    buffers.push(data)
    hash.update(data)
  }, function (err) {
    cb(err, buffers, hash.digest())
  })
  return hasher
}

function boxBlob(filePath, sbot, cb) {
  pull(File(filePath), Hash(function (err, buffers, key) {
      if(err) cb(err) 
      pull(
        pull.once(Buffer.concat(buffers)),
        BoxStream.createBoxStream(key, zeros),
        Hash(function (err, buffers, hash) {
          if(err) cb(err)
          var id = '&'+hash.toString('base64')+'.sha256'

          pull(
            pull.values(buffers), 
            sbot.blobs.add(id, function (err) {
              if(err) cb(err)
              sbot.blobs.push(id, function () {
                cb(null, id+'?unbox='+key.toString('base64')+'.boxs')
              })
            })
          )
        })
      )
    }))
}

function unBoxBlob(blobId, sbot, cb) {
  var id = blobId.split('?')[0]
  var key = new Buffer(blobId.split('?')[1].replace(/^unbox=/,''), 'base64')
  sbot.blobs.want(id, function (err, has) {
    if(err) cb(err)
    if(!has) {
      return cb('could not retrive blob:'+id)
    }
    let inFilePath = path.join(os.tmpdir(), shortid.generate())
    pull(
      sbot.blobs.get(id),
      BoxStream.createUnboxStream(key, zeros),
      toPull.sink(fs.createWriteStream(inFilePath), function (err) {
        if(err) {
          console.log(err)
          cb("Couldn't decrypt")
        }
        else cb(null, inFilePath)
      })
    )
  })
}

module.exports = {
  boxBlob,
  unBoxBlob
}
