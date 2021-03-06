const assert = require('chai').assert
const sinon = require('sinon')
const axios = require('axios')
const config = require('config')

const Worker = require('./worker')
const Data = require('./utils/sequelize').Data

describe('worker', () => {
  const stubRequest = sinon.stub(axios, 'get')
  const stubData = sinon.stub(Data, 'create')

  beforeEach(() => {
    stubRequest.reset()
    stubData.reset()
  })

  after(() => {
    stubRequest.restore()
    stubData.restore()
  })

  it('get data', (done) => {
    const normalizedSymbol = 'BCH-BTC'
    const denormalizedSymbol = 'BCH-BTC'

    stubRequest.resolves({data: {result: {'Last': 1.01230}, 'success': true}})

    Worker.getData(normalizedSymbol).then((response) => {
      assert.strictEqual(stubRequest.calledOnce, true, 'request was called once')
      assert.strictEqual(
        stubRequest.calledWith(`${config.api.url}?market=${denormalizedSymbol}`),
        true,
        'called with API URL and symbol'
      )

      done()
    })
  })

  it('start worker in single-mode', (done) => {
    const denormalizedSymbol = 'BCH-BTC'
    console.log(config.collect.pairs)
    console.log(config.collect.pairs.split(',').length)
    const numberOfPairs = config.collect.pairs.split(',').length

    stubRequest.resolves({data: {result: {'Last': 1.01230}, success: true}})

    Worker.start().then(() => {
      console.log('call count', stubData.callCount)
      assert.strictEqual(stubData.callCount, numberOfPairs, 'saved data for each pair')

      assert.strictEqual(stubRequest.callCount, numberOfPairs, 'request was called for each pair')
      assert.strictEqual(
        stubRequest.calledWith(`${config.api.url}?market=${denormalizedSymbol}`),
        true,
        'called with API URL and symbol'
      )

      done()
    })
  })
})
