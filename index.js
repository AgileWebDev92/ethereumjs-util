const SHA3 = require('sha3')
const secp256k1 = require('secp256k1')
const assert = require('assert')
const rlp = require('rlp')
const BN = require('bn.js')
const crypto = require('crypto')

/**
 * the max interger that this VM can handle (a ```BN```)
 * @var {BN} MAX_INTEGER
 */
exports.MAX_INTEGER = new BN('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', 16)

/**
 * 2^256 (a ```BN```)
 * @var {BN} TWO_POW256
 */
exports.TWO_POW256 = new BN('10000000000000000000000000000000000000000000000000000000000000000', 16)

/**
 * SHA3-256 hash of null (a ```String```)
 * @var {String} SHA3_NULL_S
 */
exports.SHA3_NULL_S = 'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470'

/**
 * SHA3-256 hash of null (a ```Buffer```)
 * @var {Buffer} SHA3_NULL
 */
exports.SHA3_NULL = new Buffer(exports.SHA3_NULL_S, 'hex')

/**
 * SHA3-256 of an RLP of an empty array (a ```String```)
 * @var {String} SHA3_RLP_ARRAY_S
 */
exports.SHA3_RLP_ARRAY_S = '1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347'

/**
 * SHA3-256 of an RLP of an empty array (a ```Buffer```)
 * @var {Buffer} SHA3_RLP_ARRAY
 */
exports.SHA3_RLP_ARRAY = new Buffer(exports.SHA3_RLP_ARRAY_S, 'hex')

/**
 * SHA3-256 hash of the RLP of null  (a ```String```)
 * @var {String} SHA3_RLP_S
 */
exports.SHA3_RLP_S = '56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421'

/**
 * SHA3-256 hash of the RLP of null (a ```Buffer```)
 * @var {Buffer} SHA3_RLP
 */
exports.SHA3_RLP = new Buffer(exports.SHA3_RLP_S, 'hex')

/**
 * [`BN`](https://github.com/indutny/bn.js)
 * @var {Function}
 */
exports.BN = BN

/**
 * [`rlp`](https://github.com/wanderer/rlp)
 * @var {Function}
 */
exports.rlp = rlp

/**
 * [`secp256k1`](https://github.com/cryptocoinjs/secp256k1-node/)
 * @var {Object}
 */
exports.secp256k1 = secp256k1

/**
 * Returns a buffer filled with 0s
 * @method zeros
 * @param {Integer} bytes  the number of bytes the buffer should be
 * @return {Buffer}
 */
exports.zeros = function (bytes) {
  var buf = new Buffer(bytes)
  buf.fill(0)
  return buf
}

/**
 * pads an array of buffer with leading zeros till it has `length` bytes
 * @method pad
 * @param {Buffer|Array} msg the value to pad
 * @param {Integer} length the number of bytes the output should be
 * @return {Buffer|Array}
 */
exports.pad = function (msg, length) {
  msg = exports.toBuffer(msg)
  if (msg.length < length) {
    var buf = exports.zeros(length)
    msg.copy(buf, length - msg.length)
    return buf
  }
  return msg.slice(-length)
}

/**
 * pads an array of buffer with trailing zeros till it has `length` bytes
 * @method rpad
 * @param {Buffer|Array} msg the value to pad
 * @param {Integer} length the number of bytes the output should be
 * @return {Buffer|Array}
 */
exports.rpad = function (msg, length) {
  msg = exports.toBuffer(msg)
  if (msg.length < length) {
    var buf = exports.zeros(length)
    msg.copy(buf)
    return buf
  }
  return msg.slice(-length)
}

/**
 * Trims leading zeros from a buffer or an array
 * @method unpad
 * @param {Buffer|Array|String}
 * @return {Buffer|Array|String}
 */
exports.unpad = exports.stripZeros = function (a) {
  a = exports.stripHexPrefix(a)
  var first = a[0]
  while (a.length > 0 && first.toString() === '0') {
    a = a.slice(1)
    first = a[0]
  }
  return a
}
/**
 * Attempts to turn a value into a Buffer. Attempts to turn a value into a Buffer. Supports Buffer, string, number, null/undefined, BN.js or other objects with a toArray() method.
 * @method toBuffer
 * @param {*} v the value
 */
exports.toBuffer = function (v) {
  if (!Buffer.isBuffer(v)) {
    if (Array.isArray(v)) {
      v = new Buffer(v)
    } else if (typeof v === 'string') {
      if (exports.isHexPrefixed(v)) {
        v = new Buffer(exports.padToEven(exports.stripHexPrefix(v)), 'hex')
      } else {
        v = new Buffer(v)
      }
    } else if (typeof v === 'number') {
      v = exports.intToBuffer(v)
    } else if (v === null || v === undefined) {
      v = new Buffer([])
    } else if (v.toArray) {
      // converts a BN to a Buffer
      v = new Buffer(v.toArray())
    } else {
      throw new Error('invalid type')
    }
  }
  return v
}

/**
 * Converts an integer into a hex string
 * @method intToHex
 * @param {Number} i
 * @return {String}
 */
exports.intToHex = function (i) {
  assert(i % 1 === 0, 'number is not a interger')
  assert(i >= 0, 'number must be positive')
  var hex = i.toString(16)
  if (hex.length % 2) {
    hex = '0' + hex
  }

  return hex
}

/**
 * Converts an `Integer` to a `Buffer`
 * @method intToBuffer
 * @param {Integer} i
 * @return {Buffer}
 */
exports.intToBuffer = function (i) {
  var hex = exports.intToHex(i)
  return new Buffer(hex, 'hex')
}

/**
 * Converts a `Buffer` to an `Interger`
 * @method bufferToInt
 * @param {Buffer} buf
 * @return {Number}
 */
exports.bufferToInt = function (buf) {
  buf = exports.toBuffer(buf)
  if (buf.length === 0) {
    return 0
  }

  return parseInt(buf.toString('hex'), 16)
}

/**
 * interpets a `Buffer` as a signed integer and returns a `bignum`
 * @method fromSigned
 * @param {Buffer} num
 * @return {BN}
 */
exports.fromSigned = function (num) {
  // Could use num.testn(255), but this is faster:
  if (num.length === 32 && num[0] >= 128) {
    return new BN(num).inotn(256).iaddn(1).ineg()
  }

  return new BN(num)
}

/**
 * Converts a `Bignum` to an unsigned interger and returns it as a `Buffer`
 * @method toUnsigned
 * @param {Bignum} num
 * @return {Buffer}
 */
exports.toUnsigned = function (num) {
  if (num.isNeg()) {
    return new Buffer(num.abs().inotn(256).iaddn(1).toArray())
  }

  return new Buffer(num.toArray())
}

/**
 * Creates SHA-3 hash of the input
 * @method sha3
 * @param {Buffer|Array|String|Number} a the input data
 * @param {Number} [bytes=256] the SHA width
 * @return {Buffer}
 */
exports.sha3 = function (a, bytes) {
  a = exports.toBuffer(a)
  if (!bytes) bytes = 256

  var h = new SHA3.SHA3Hash(bytes)
  if (a) {
    h.update(a)
  }
  return new Buffer(h.digest('hex'), 'hex')
}

/**
 * Creates SHA256 hash of the input
 * @method sha256
 * @param {Buffer|Array|String|Number} a the input data
 * @return {Buffer}
 */
exports.sha256 = function (a) {
  a = exports.toBuffer(a)
  return crypto.createHash('SHA256').update(a).digest()
}

/**
 * Creates RIPEMD160 hash of the input
 * @method ripemd160
 * @param {Buffer|Array|String|Number} a the input data
 * @param {Boolean} padded whether it should be padded to 256 bits or not
 * @return {Buffer}
 */
exports.ripemd160 = function (a, padded) {
  a = exports.toBuffer(a)
  var hash = crypto.createHash('rmd160').update(a).digest()
  if (padded === true) {
    return exports.pad(hash, 32)
  } else {
    return hash
  }
}

/**
 * Creates SHA-3 hash of the RLP encoded version of the input
 * @method rlphash
 * @param {Buffer|Array|String|Number} a the input data
 * @return {Buffer}
 */
exports.rlphash = function (a) {
  return exports.sha3(rlp.encode(a))
}

/**
 * Returns the ethereum address of a given public key
 * @method pubToAddress
 * @param {Buffer}
 * @return {Buffer}
 */
exports.pubToAddress = exports.publicToAddress = function (pubKey) {
  pubKey = exports.toBuffer(pubKey)
  var hash = new SHA3.SHA3Hash(256)
  hash.update(pubKey.slice(-64))
  return new Buffer(hash.digest('hex').slice(-40), 'hex')
}

/**
 * Returns the ethereum public key of a given private key
 * @method privateToPublic
 * @param {Buffer} privateKey
 * @return {Buffer}
 */
var privateToPublic = exports.privateToPublic = function (privateKey) {
  privateKey = exports.toBuffer(privateKey)
  // skip the type flag and use the X, Y points
  return secp256k1.publicKeyConvert(secp256k1.publicKeyCreate(privateKey), false).slice(1)
}

/**
 * Returns the ethereum address of a given private key
 * @method privateToAddress
 * @param {Buffer} privateKey
 * @return {Buffer}
 */
exports.privateToAddress = function (privateKey) {
  return exports.publicToAddress(privateToPublic(privateKey))
}

/**
 * Generates an address of a newly created contract
 * @method generateAddress
 * @param {Buffer} from the address which is creating this new address
 * @param {Buffer} nonce the nonce of the from account
 * @return {Buffer}
 */
exports.generateAddress = function (from, nonce) {
  from = exports.toBuffer(from)
  nonce = new Buffer(new BN(nonce).toArray())

  if (nonce.toString('hex') === '00') {
    nonce = 0
  }

  var hash = exports.sha3(rlp.encode([new Buffer(from, 'hex'), nonce]))
  return hash.slice(12)
}

/**
 * Returns true if the supplied address belongs to a precompiled account
 * @method isPrecompiled
 * @param {Buffer|String}
 * @return {Boolean}
 */
exports.isPrecompiled = function (address) {
  var a = exports.unpad(address)
  return a.length === 1 && a[0] > 0 && a[0] < 5
}

/**
 * Returns a `Boolean` on whether or not the a `Sting` starts with "0x"
 * @method isHexPrefixed
 * @param {String} str
 * @return {Boolean}
 */
exports.isHexPrefixed = function (str) {
  return str.slice(0, 2) === '0x'
}

/**
 * Removes "0x" from a given `String`
 * @method stripHexPrefix
 * @param {String} str
 * @return {String}
 */
exports.stripHexPrefix = function (str) {
  if (typeof str !== 'string') {
    return str
  }
  return exports.isHexPrefixed(str) ? str.slice(2) : str
}

/**
 * Adds "0x" to a given string if it does not already start with "0x"
 * @method addHexPrefix
 * @param {String}
 * @return {String}
 */
exports.addHexPrefix = function (str) {
  if (typeof str !== 'string') {
    return str
  }

  return exports.isHexPrefixed(str) ? str : '0x' + str
}

/**
 * Defines properties on a Object. It make the assumption that underlying data is binary
 * @method defineProperties
 * @param {Object} self the `Object` to define properties on
 * @param {Array} fields an array fields to define. Fields can contain:
 * * `name` - the name of the properties
 * * `length` - the number of bytes the field can have
 * * `allowLess` - if the field can be less than the length
 * * `allowEmpty`
 * @param {*} Data data to be validated against the definitions
 */
exports.defineProperties = function (self, fields, data) {
  self.raw = []
  self._fields = []

  self.toJSON = function (label) {
    if (label) {
      var obj = {}

      for (var prop in this) {
        if (typeof this[prop] !== 'function' && prop !== 'raw' && prop !== '_fields') {
          obj[prop] = '0x' + this[prop].toString('hex')
        }
      }
      return obj
    }

    return exports.baToJSON(this.raw)
  }

  fields.forEach(function (field, i) {
    self._fields.push(field.name)
    Object.defineProperty(self, field.name, {
      enumerable: true,
      configurable: true,
      get: function () {
        return this.raw[i]
      },
      set: function (v) {
        v = exports.toBuffer(v)

        if (v.toString('hex') === '00' && !field.allowZero) {
          v = new Buffer([])
        }

        if (field.allowLess && field.length) {
          v = exports.stripZeros(v)
          assert(field.length >= v.length)
        } else if (!(field.allowZero && v.length === 0) && field.length) {
          assert(field.length === v.length, 'The field ' + field.name + ' must have byte length of ' + field.length)
        }

        this.raw[i] = v
      }
    })

    if (field.default) {
      self[field.name] = field.default
    }
  })

  if (data) {
    if (typeof data === 'string') {
      data = new Buffer(exports.stripHexPrefix(data), 'hex')
    }

    if (Buffer.isBuffer(data)) {
      data = rlp.decode(data)
    }

    if (Array.isArray(data)) {
      if (data.length > self._fields.length) {
        throw (new Error('wrong number of fields in data'))
      }

      // make sure all the items are buffers
      data.forEach(function (d, i) {
        self[self._fields[i]] = exports.toBuffer(d)
      })
    } else if (typeof data === 'object') {
      for (var prop in data) {
        if (self._fields.indexOf(prop) !== -1) {
          self[prop] = data[prop]
        }
      }
    } else {
      throw new Error('invalid data')
    }
  }
}

/**
 * Print a Buffer Array
 * @method printBA
 * @param {Buffer|Array}
 */
exports.printBA = function (ba) {
  if (Buffer.isBuffer(ba)) {
    if (ba.length === 0) {
      console.log('new Buffer(0)')
    } else {
      console.log("new Buffer('" + ba.toString('hex') + "', 'hex')")
    }
  } else if (ba instanceof Array) {
    console.log('[')
    for (var i = 0; i < ba.length; i++) {
      exports.printBA(ba[i])
      console.log(',')
    }
    console.log(']')
  } else {
    console.log(ba)
  }
}

/**
 * converts a buffer array to JSON
 * @method BAToJSON
 * @param {Buffer|Array}
 */
exports.baToJSON = function (ba) {
  if (Buffer.isBuffer(ba)) {
    return ba.toString('hex')
  } else if (ba instanceof Array) {
    var array = []
    for (var i = 0; i < ba.length; i++) {
      array.push(exports.baToJSON(ba[i]))
    }
    return array
  }
}

/**
 * Pads a String to have an even length
 * @method padToEven
 * @param {String}
 */
exports.padToEven = function (a) {
  if (a.length % 2) a = '0' + a
  return a
}
