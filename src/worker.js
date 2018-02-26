const R = require('ramda')
const axios = require('axios')
const config = require('config')
const normalize = require('x-cryptocurrencies-normalizr')
const logger = require('./utils/logging').logger
const Data = require('./utils/sequelize').Data

const Worker = () => {}

Worker.getData = async (normalizedPair) => {
  /*
   * The `normalizedPair` parameter is normalized accross all workers
   * since we can't send the request with that value
   * we must first denormalize it
  * */

  let url = config.api.url
  let exchangePair
  if (normalizedPair) {
    exchangePair = normalize.denormalize.pair(normalizedPair, config.get('exchange').name)
    url += `?market=${exchangePair}`
  }

  const normalizedPairList = normalizedPair.split('-')

  return axios.get(url)
    .then((res) => {
      if (!res.data.success) {
        logger.error(res.data)
      }

      return {
        baseAsset: normalizedPairList[0],
        quoteAsset: normalizedPairList[1],
        normalizedPair: normalizedPair,
        denormalizedPair: exchangePair,
        price: res.data.result.Last.toString()
      }
    })
    .catch((err) => {
      logger.error(
        `error requesting ${url}.
         Error: ${err}`
      )
    })
}

Worker.call = async () => {
  const requestList = []

  if (config.collect.specificPrices === false) {
    // collect all prices available
    requestList.push(
      Worker.getData()
    )
  } else {
    // collect only a given set of pairs
    if (config.collect.pairs === undefined) {
      throw new Error(
        `in order to collect specific prices you must set \`COLLECT_PAIRS\` with comma separated pairs.
         e.g.: export COLLECT_PAIRS=BTC-ETH,BTC-IOTA,ETH-IOTA
        `
      )
    }

    const coinPairs = R.split(',', config.collect.pairs)

    for (let i = 0; i < coinPairs.length; i++) {
      let coinPair = coinPairs[i]

      requestList.push(
        Worker.getData(coinPair)
      )
    }
  }

  return Promise.all(requestList)
    .then(async (responses) => {
      for (let i = 0; i < responses.length; i++) {
        let response = responses[i]

        logger.debug(response)
        await Data.create(response)
      }
    })
    .catch((err) => {
      logger.error(err)
    })
}

Worker.start = () => {
  logger.info(`starting with ${config.running.mode} mode and interval set to ${config.interval}`)

  return new Promise((resolve, reject) => {
    if (config.running.mode === 'single-time' || config.interval === undefined) {
      Worker.call()
        .then(() => resolve())
        .catch((err) => {
          logger.error(err)
          return reject(err)
        })
      return
    }

    setInterval(Worker.call, config.interval)
    return resolve()
  })
}

module.exports = Worker
