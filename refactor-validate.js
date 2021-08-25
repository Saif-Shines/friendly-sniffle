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

function validateProd(listedProd, locations) {
  const NO_PRODUCT = 'Atleast one product must be mentioned in manifest.json'
  const invalidProducts = _.difference(_.keys(listedProd), _.keys(locations))
  const INVALID_PRODUCTS = `Invalid product(s) mentioned in manifest.json: ${invalidProducts}`

  if (_.isEmpty(_.keys(manifest.product))) {
    return NO_PRODUCT
  }

  if (invalidProducts.length > 0) {
    return INVALID_PRODUCTS
  }

  return undefined
}

function validate(appType, fix, validationType) {
  const errMsgs = []
  const errWithProd = validateProd(manifest.product, productLocations)

  return errMsgs
}

module.exports = {
  name: 'manifest',
  validationType: [PRE_PKG_VALIDATION, RUN_VALIDATION],
  validate,
}
