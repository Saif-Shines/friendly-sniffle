/* eslint-disable*/
'use strict'

const os = require('os')
const _ = require('lodash')
const url = require('url')

const fileUtil = require('../utils/file-util')
const manifest = require('../manifest')
const sizeOf = require('image-size')
const constants = require('./constants')

const addonVersion = require('../utils/product-info-util').getAddonVersion()
const productLocations = require(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/locations/product_locations`)
const fdkconfig = require(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/product_info.json`)

const SUPPORTED_PLATFORMS = ['2.0', '2.1']
const ICON_HEIGHT = 64
const ICON_WIDTH = 64
const IP_REGEX = /\b((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.|$)){4}\b/
const IPARAM_REGEX = /\<\%\=\s*.*\s*\%\>/
const STAR_REGEX = /^(https:\/\/)[\*]+([\-\.]{1}[a-z0-9]+)*\.[a-z]*$/
const {PRE_PKG_VALIDATION, RUN_VALIDATION} = constants.validationContants
const validOmniAppProducts = fdkconfig.omni_products

function validatePlatform() {
  const INVALID_PLAT_VER = `Invalid platform version mentioned in manifest.json - ${manifest.pfVersion}`
  const INVLD_PLAT_LOG =
    '\x1b[33m[WARN]\x1b[0m Platform version 2.0 will be deprecated shortly.\nPlease update the app manifest to latest version (2.1) to use latest features.\n'

  if (!_.includes(SUPPORTED_PLATFORMS, manifest.pfVersion)) {
    return INVALID_PLAT_VER
  }
  if (
    manifest.pfVersion === '2.0' &&
    Object.keys(manifest.product || {}).length > 1
  ) {
    return logger.warn(INVLD_PLAT_LOG)
  }
  return undefined
}

function validateProduct() {
  /* validate the products mentioned in manifest.json */
  const NO_PRODUCT = 'Atleast one product must be mentioned in manifest.json'
  const invalidProducts = _.difference(
    _.keys(manifest.product),
    _.keys(productLocations),
  )
  const INVALID_PRODUCTS = `Invalid product(s) mentioned in manifest.json: ${invalidProducts}`

  if (_.isEmpty(_.keys(manifest.product))) {
    return NO_PRODUCT
  }
  if (invalidProducts.length > 0) {
    return INVALID_PRODUCTS
  }
  return undefined
}

function validateOmniApp() {
  const productArr = _.keys(manifest.product)
  const unsupportedProducts = _.difference(productArr, validOmniAppProducts)

  if (unsupportedProducts.length) {
    return `Omniapps is available only for - ${validOmniAppProducts}`
  }
  return undefined
}

function recProbInFrontend(products) {
  const locationFieldErr = []

  for (const prod in products) {
    for (const location in products[prod].location) {
      const templateFile = products[prod].location[location].url
      const icon = products[prod].location[location].icon

      const noEntryFile = _.isUndefined(templateFile) || templateFile === ''
      const noEntryFileInDir =
        fileUtil.fileExists(`./app/${templateFile}`) === false

      /*eslint-disable no-unused-expressions*/
      noEntryFile &&
        locationFieldErr.push(
          `Url is either not mentioned or empty in ${prod}/${location}`,
        )
      noEntryFileInDir &&
        locationFieldErr.push(
          `Template file '${templateFile}' mentioned in ${prod}/${location} is not found in app folder`,
        )

      if (
        !_.includes(productLocations[prod].location_without_icons, location)
      ) {
        if (_.isUndefined(icon) || icon === '') {
          locationFieldErr.push(
            `Icon is either not mentioned or empty in ${prod}/${location}`,
          )
        } else if (fileUtil.fileExists(`./app/${icon}`) === false) {
          locationFieldErr.push(
            `Icon '${icon}' mentioned in ${prod}/${location} is not found in app folder`,
          )
        } else {
          const dimensions = sizeOf(`./app/${icon}`)

          if (
            dimensions.width !== ICON_WIDTH ||
            dimensions.height !== ICON_HEIGHT
          ) {
            locationFieldErr.push(
              `Invalid dimension of icon '${icon}' for ${prod}/${location}`,
            )
          }
        }
      }
    }
  }

  return locationFieldErr
}

function validateLocation(appType) {
  let prod
  let invalidLocationMsg = ''
  let products = manifest.product

  function isPureBackendApp() {
    return appType && appType.includes('purebackend')
  }

  function verifyLocInOmni() {
    products = {}
    manifest.product.forEach(function(eachProd) {
      if (
        manifest.product[eachProd].location ||
        !manifest.product[eachProd].events
      ) {
        products[eachProd] = manifest.product[eachProd]
      }
    })
  }
  // Skip location validation if purebackend app.
  /*eslint-disable no-unused-expressions*/
  if (isPureBackendApp()) {
    return undefined
  }

  manifest.features.includes('omni') &&
    manifest.features.includes('backend') &&
    manifest.pfVersion !== '2.0' &&
    verifyLocInOmni()

  /*
    validate the locations mentioned under each product in manifest.json
    if it is not a purebackend app.
  */
  try {
    for (prod in products) {
      const manifestLocations = Object.keys(products[prod].location)

      if (_.isEmpty(manifestLocations)) {
        return `Missing locations for product: ${prod}`
      }
      const invalidLocations = _.difference(
        manifestLocations,
        productLocations[prod].location,
      )

      if (invalidLocations.length > 0) {
        invalidLocationMsg += `\n     ${prod} - ${invalidLocations}`
      }
    }
  } catch (err) {
    logger.error(err)
    return 'Invalid manifest / folder configuration for app'
  }

  if (invalidLocationMsg !== '') {
    return `Invalid location(s) mentioned in manifest.json: ${invalidLocationMsg}`
  }

  if (fileUtil.fileExists('./app')) {
    return recProbInFrontend(products)
  }
  return undefined
}

function checkEachDomain(validationType) {
  const err = []
  const ipDomains = []
  const slashDomains = []
  const httpDomains = []
  const localhostDomains = []
  const domainWithPath = []
  const regexDomains = []

  const listedURLs = manifest.whitelistedDomains

  listedURLs.forEach(function segregate(domain) {
    const withAstrisk = domain.indexOf('*') !== -1

    function isValidStarRegex() {
      if (!domain.match(STAR_REGEX)) {
        regexDomains.push(domain)
      }
    }

    function continueSegregation() {
      const urlObject = url.parse(domain.replace(IPARAM_REGEX, 'abc'))

      if (
        urlObject.hostname === 'localhost' &&
        urlObject.protocol === 'http:' &&
        validationType === 'run_validation'
      ) {
        return undefined
      }

      if (urlObject.path !== '/') {
        domainWithPath.push(domain)
      } else if (domain.endsWith('/')) {
        slashDomains.push(domain)
      }
      if (urlObject.hostname === 'localhost') {
        localhostDomains.push(domain)
      }
      if (!domain.startsWith('https://')) {
        httpDomains.push(domain)
      }
      if (!_.isNull(IP_REGEX.exec(urlObject.hostname))) {
        ipDomains.push(domain)
      }
      return undefined
    }

    withAstrisk ? isValidStarRegex() : continueSegregation()
  })

  return {
    err,
    ipDomains,
    slashDomains,
    httpDomains,
    localhostDomains,
    domainWithPath,
    regexDomains,
  }
}

function findErrInListedDomains(validationType) {
  const {
    ipDomains,
    slashDomains,
    httpDomains,
    domainWithPath,
    localhostDomains,
    regexDomains,
    err,
  } = checkEachDomain(validationType)

  if (!_.isEmpty(ipDomains)) {
    err.push(`Whitelisted domains must not contain IP addresses: ${ipDomains}`)
  }
  if (!_.isEmpty(slashDomains)) {
    err.push(`Whitelisted domains must not end with a '/': ${slashDomains}`)
  }
  if (!_.isEmpty(httpDomains)) {
    err.push(`Whitelisted domains must use HTTPS: ${httpDomains}`)
  }
  if (!_.isEmpty(domainWithPath)) {
    err.push(`Whitelisted domains must not have path: ${domainWithPath}`)
  }
  if (!_.isEmpty(localhostDomains)) {
    err.push(`Whitelisted domains must not be localhost: ${localhostDomains}`)
  }
  if (!_.isEmpty(regexDomains)) {
    err.push(
      `Whitelisted domains must not have more than one subdomain: ${regexDomains}`,
    )
  }
  return err
}

module.exports = {
  name: 'manifest',
  validationType: [PRE_PKG_VALIDATION, RUN_VALIDATION],
  validate(appType, fix, validationType) {
    const errMsgs = []
    let locationErr, omniAppErr
    const productErrorMsg = validateProduct()
    const platformErr = validatePlatform()

    const whitelistDomainErr = findErrInListedDomains(validationType)

    function recordError(errorsFound) {
      return errMsgs.push(errorsFound)
    }

    if (manifest.features.includes('omni')) {
      omniAppErr = validateOmniApp()
    }

    /*eslint-disable no-unused-expressions*/
    !_.isUndefined(whitelistDomainErr) && recordError(whitelistDomainErr)
    _.isUndefined(productErrorMsg) && recordError(validateLocation(appType))
    !_.isUndefined(productErrorMsg) && recordError(productErrorMsg)
    !_.isUndefined(locationErr) && recordError(validateLocation(appType))
    !_.isUndefined(platformErr) && recordError(platformErr)
    !_.isUndefined(omniAppErr) && recordError(omniAppErr)

    return _.flattenDeep(errMsgs)
  },
}
