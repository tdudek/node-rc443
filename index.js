const RcSwitch = require('node-rcswitch2')
const Hapi = require('hapi')

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

const server = new Hapi.Server({
  port: 3000,
  host: 'localhost',
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
          'status': 'success',
          'message': `code ${code} successfully sent`
        }
      })
      .catch(err => {
        const message = `failed to send code ${code}`
        console.error(message, err)
        return h.badImplementation(message)
      })
  }
})

const provision = async () => {
  try {
    await server.register(Inert)
    await server.start()
  }
  catch (err) {
    console.log(err);
    process.exit(1);
  }

  console.log('Server running at:', server.info.uri);
}

provision()