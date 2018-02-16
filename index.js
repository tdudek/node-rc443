const RcSwitch = require('node-rcswitch2')
const Hapi = require('hapi')
const HapiBoomDecorators = require('hapi-boom-decorators')
const deviceList = require('./devices.json')

const send = code => {
  return new Promise((resolve, reject) => {
    try {
      const rc = new RcSwitch()
      rc.enableTransmit(0)
      rc.setProtocol(4)
      rc.send(code, 24)  
      resolve()
    } catch (err) {
      reject()
    }
  })
}

class Devices {
  constructor(devices) {
    this.devices = devices || []
  }

  register(device) {
    this._validate(device)

    if (this.contains(device.name)) {
      throw Error(`device ${device.name} already exists`)
    }

    device.type = 'switch-device'

    this.devices.push(device)
    return device
  }

  list() {
    return this.devices
  }

  get(name) {
    const device = this.devices.find(d => d.name == name)
    if (typeof device === 'undefined') {
      return null
    }
    return new SwitchDevice(device)
  }

  contains(name) {
    return this.get(name) !== null
  }

  _validate(device) {
    if (typeof device.name === 'undefined') {
      throw Error('device.name must not be empty')
    }
    if (device.codes == null || typeof device.codes !== 'object') {
      throw Error('device.name must not be empty')
    }
    if (typeof device.codes.on !== 'number') {
      throw Error('device.codes.on must be set and must be a number')
    }
    if (typeof device.codes.off !== 'number') {
      throw Error('device.codes.on must be set and must be a number')
    }
    return device
  }
}

class SwitchDevice {
  constructor(device) {
    this.device = device
  }

  on() {
    return send(this.device.codes.on)
  }

  off() {
    return send(this.device.codes.off)
  }
  
}

const devices = new Devices(deviceList)

const server = new Hapi.Server({
  port: 3000,
  host: '0.0.0.0',
})

server.route({
  method: 'GET',
  path: '/api/code/{code}',
  handler: (request, h) => {
    const code = parseInt(request.params.code, 10)
    if (Number.isNaN(code)) {
      return h.badRequest('code must be a number')
    }

    return send(code)
      .then(() => {
        return {
          code,
          message: `code ${code} successfully sent`,
        }
      })
      .catch(err => {
        const message = `failed to send code ${code}`
        console.error(message, err)
        return h.badImplementation(message)
      })
  }
})

server.route({
  method: 'GET',
  path: '/api/devices',
  handler: (request, h) => devices.list()
})

server.route({
  method: 'POST',
  path: '/api/devices',
  handler: (request, h) => {
    try {
      const device = devices.register(request.payload)
      return device
    } catch (err) {
      return h.badRequest(err)
    }
  }
})

server.route({
  method: 'PATCH',
  path: '/api/devices/{name}',
  handler: (request, h) => {
    const device = devices.get(request.params.name)
    if (device === null) {
      return h.notFound()
    }

    const command = request.payload.command
    if (command === 'on') {
      return device.on()
        .then(() => {
          return {
            command,
            message: 'command executed',
          }
        })
        .catch(() => h.badImplementation())
    }
    if (command === 'off') {
      return device.off()
        .then(() => {
          return {
            command,
            message: 'command executed',
          }
        })
        .catch(() => h.badImplementation())
    }

    return h.badRequest()
  }
})

const provision = async () => {
  try {
    await server.register(HapiBoomDecorators)
    await server.start()
  }
  catch (err) {
    console.log(err);
    process.exit(1);
  }

  console.log('Server running at:', server.info.uri);
}

provision()