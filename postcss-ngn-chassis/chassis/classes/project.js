const ChassisAtRules = require('./at-rules')
const ChassisViewport = require('./viewport')
const ChassisTypography = require('./typography')
const ChassisLayout = require('./layout')

const util = require('../utilities')

class ChassisProject extends NGN.EventEmitter {
  constructor () {
    super()

    this.defaultMinWidth = 320
		this.defaultMaxWidth = 1440
		this.goldenRatio = 1.61803398875

    this.stylesheets = [
      'stylesheets/reset.css',
      'stylesheets/helpers.css',
      'stylesheets/copic-greys.css'
    ]

    this.defaultViewportWidthRanges = [
      {
        name: 'tiny',
        lowerBound: this.defaultMinWidth,
        upperBound: 512
      },
      {
        name: 'small',
        lowerBound: 512,
        upperBound: 768
      },
      {
        name: 'medium',
        lowerBound: 768,
        upperBound: 1024
      },
      {
        name: 'large',
        lowerBound: 1024,
        upperBound: 1200
      },
      {
        name: 'huge',
        lowerBound: 1200,
        upperBound: this.defaultMaxWidth
      }
    ]

    const ViewportWidthRangeModel = new NGN.DATA.Model({
      fields: {
        name: {
          type: String,
          pattern: /^\S*$/gi
        },
        lowerBound: {
          type: Number,
          validate (value) {
            return value < this.upperBound
          }
        },
        upperBound: {
          type: Number,
          validate (value) {
            return value > this.lowerBound
          }
        }
      }
    })

    const LayoutModel = new NGN.DATA.Model({
      fields: {
        gutter: {
          type: String,
          default: '6.18vw',
          pattern: /^(auto|0)$|^[0-9]+.?([0-9]+)?(px|em|ex|%|in|cm|mm|pt|pc|vw|vh|rem)$/gi
        },
        minWidth: {
          type: Number,
          default: this.defaultMinWidth,
          min: 0
        },
        maxWidth: {
          type: Number,
          default: this.defaultMaxWidth,
          min: 0
        }
      }
    })

    const fontSizeModel = new NGN.DATA.Model({
      fields: {
        headings: {
          type: Object,
          default: {
            '1': 'larger',
            '2': 'large',
            '3': 'root',
            '4': 'small',
            '5': 'small',
            '6': 'small'
          },
          validate (data) {
            let mh = new MustHave()

            if (!mh.hasExactly(data, '1', '2', '3', '4', '5', '6')) {
              return false
            }

            return Object.keys(data).every(key => {
              return typeof data[key] === 'string'
            })
          }
        },
        formLegend: {
          type: String,
          default: 'large'
        }
      }
    })

    const TypographyModel = new NGN.DATA.Model({
      relationships: {
        fontSizes: fontSizeModel
      },

      fields: {
        baseFontSize: {
          type: Number,
          default: 16,
          min: 1
        },
        typeScaleRatio: {
          type: Number,
          default: this.goldenRatio,
          min: 0
        },
        globalMultiplier: {
          type: Number,
          default: 1,
          min: 0
        },
        fontWeights: {
          type: Object,
          default: {
            thin: 100,
            light: 300,
            regular: 400,
            semibold: 500,
            bold: 700,
            ultra: 900
          },
          validate (data) {
            let legitimateValues = ['normal', 'bold', 'lighter', 'bolder', '100', '200', '300', '400', '500', '600', '700', '800', '900']

            return Object.keys(data).every(key => {
              return legitimateValues.includes(data[key].toString().trim().toLowerCase())
            })
          }
        }
      }
    })

    const SettingsModel = new NGN.DATA.Model({
      relationships: {
        viewportWidthRanges: [ViewportWidthRangeModel],
        layout: LayoutModel,
        typography: TypographyModel
      },

      fields: {
        zIndex: {
          type: Object,
          default: {
            min: -1000,
            behind: -1,
            default: 1,
            front: 2,
            max: 1000
          },

          validate (data) {
            return Object.keys(data).every(key => {
              return typeof data[key] === 'number'
                && data[key] > (-2147483648)
                && data[key] < 2147483647
            })
          }
        }
      }
    })

    this.settings = new SettingsModel()

    this.settings.once('load', () => {
      this.settings.viewportWidthRanges.sort({
        lowerBound: 'asc'
      })

      this.viewport = new ChassisViewport(this.settings.data.viewportWidthRanges)
      this.typography = new ChassisTypography(this.viewport, this.settings.data.typography)
      this.layout = new ChassisLayout(this.viewport, this.typography, this.settings.data.layout)
      this.atRules = new ChassisAtRules(this)
    })
  }

  get coreStyles () {
    let { widthRanges } = this.viewport
    let firstRange = widthRanges[0]
    let styles
    let mediaQueries = []

    styles = util.parseStylesheets(this.stylesheets)
    .append(util.newRule('.width-constraint', this.atRules.constrainWidth()))

    .append(util.newAtRule({
      name: 'media',
      params: `screen and (max-width: ${this.layout.minWidth}px)`,
      nodes: [
        util.newRule('.width-constraint', [
          util.newDeclObj('padding-left', this.layout.getParsedGutter(this.layout.minWidth)),
          util.newDeclObj('padding-right', this.layout.getParsedGutter(this.layout.minWidth))
        ])
      ]
    }))

    .append(util.newAtRule({
      name: 'media',
      params: `screen and (min-width: ${this.layout.maxWidth}px)`,
      nodes: [
        util.newRule('.width-constraint', [
          util.newDeclObj('padding-left', this.layout.getParsedGutter(this.layout.maxWidth)),
          util.newDeclObj('padding-right', this.layout.getParsedGutter(this.layout.maxWidth))
        ])
      ]
    }))

    .append(util.newRule('.chassis', [
      util.newDeclObj('min-width', `${this.layout.minWidth}px`),
      util.newDeclObj('margin', '0'),
      util.newDeclObj('padding', '0'),
      util.newDeclObj('font-size', `${this.typography.getFontSize('root', firstRange.upperBound)}px`),
      util.newDeclObj('line-height', `${this.typography.getLineHeight('root', firstRange.upperBound)}px`)
    ]))

    for (let i = 1; i <=6; i++) {
      styles.append(this.typography.getHeadingStyles(i.toString(), firstRange))
    }

    styles.append(this.typography.getFormLegendStyles(firstRange))
    .append(this.layout.getContainerStyles(firstRange))
    .append(this.layout.getBlockElementStyles(firstRange))
    .append(this.typography.getParagraphStyles(firstRange))

    widthRanges.forEach((range, index) => {
      let mediaQuery

      if ( index === widthRanges.length - 1 ) {
        mediaQuery = this.viewport.getMediaQuery('min', range.name)
      } else if ( index !== 0 ) {
        mediaQuery = this.viewport.getMediaQuery('at', range.name)
      } else {
        return
      }

      if (!mediaQuery) {
        return
      }

      let rule = util.newRule('.chassis', [
        util.newDeclObj('font-size', `${this.typography.getFontSize('root', range.upperBound)}px`),
        util.newDeclObj('line-height', `${this.typography.getLineHeight('root', range.upperBound)}px`)
      ])

      mediaQuery.nodes.push(rule)

      for (let i = 1; i <= 6; i++) {
        mediaQuery.nodes.push(this.typography.getHeadingStyles(i.toString(), range))
      }

      mediaQuery.nodes.push(this.typography.getFormLegendStyles(range))
      mediaQuery.nodes.push(this.layout.getContainerStyles(range))
      mediaQuery.nodes.push(this.layout.getBlockElementStyles(range))
      mediaQuery.nodes.push(this.typography.getParagraphStyles(range))

      mediaQueries.push(mediaQuery)
    })

    mediaQueries.forEach(mediaQuery => {
      styles.append(mediaQuery)
    })

    return styles
  }
}

module.exports = ChassisProject