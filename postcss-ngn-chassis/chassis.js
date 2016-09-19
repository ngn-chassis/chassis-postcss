'use strict'

require('ngn')
const fs = require('fs')
const path = require('path')

class ChassisProject extends NGN.EventEmitter {
	constructor(cfg, postcss) {

		cfg = cfg || {}

		super()

		const defaultMinWidth = 320
		const defaultMaxWidth = 1440
		const goldenRatio = 1.61803398875

		Object.defineProperties(this, {
			constants: NGN.privateconst({
				math: {
					goldenRatio: goldenRatio
				},
				typography: {
					headingAliases: {
						'1': 'larger',
						'2': 'large',
						'3': 'root',
						'4': 'small',
						'5': 'small',
						'6': 'small'
					},
					formLegendAlias: 'large',
					definitions: [
						{
							lowerBound: 0,
							upperBound: 320,
							fontSizes: {
								root: 14,
								small: 11,
								large: 18,
								larger: 23,
								largest: 37
							}
						},
						{
							lowerBound: 320,
							upperBound: 512,
							fontSizes: {
								root: 15,
								small: 12,
								large: 19,
								larger: 24,
								largest: 39
							}
						},
						{
							lowerBound: 512,
							upperBound: 768,
							fontSizes: {
								root: 16,
								small: 13,
								large: 20,
								larger: 26,
								largest: 42
							}
						},
						{
							lowerBound: 768,
							upperBound: 1024,
							fontSizes: {
								root: 17,
								small: 13,
								large: 22,
								larger: 28,
								largest: 45
							}
						},
						{
							lowerBound: 1024,
							upperBound: 1200,
							fontSizes: {
								root: 18,
								small: 14,
								large: 23,
								larger: 29,
								largest: 47
							}
						},
						{
							lowerBound: 1200,
							upperBound: 1440,
							fontSizes: {
								root: 19,
								small: 15,
								large: 24,
								larger: 31,
								largest: 50
							}
						},
						{
							lowerBound: 1440,
							upperBound: 1600,
							fontSizes: {
								root: 20,
								small: 16,
								large: 25,
								larger: 32,
								largest: 52
							}
						},
						{
							lowerBound: 1600,
							upperBound: 1920,
							fontSizes: {
								root: 21,
								small: 17,
								large: 27,
								larger: 34,
								largest: 55
							}
						},
						{
							lowerBound: 1920,
							upperBound: 2048,
							fontSizes: {
								root: 22,
								small: 17,
								large: 28,
								larger: 36,
								largest: 58
							}
						}
					]
				}
			}),
			
			defaultSettings: NGN.privateconst({
				layout: {
					gutter: '6.18vw',
					minWidth: defaultMinWidth,
					maxWidth: defaultMaxWidth
				},
				typography: {
					baseFontSize: 16,
					typeScaleRatio: goldenRatio,
					globalMultiplier: 1
				},
				viewportWidthRanges: [
					{
						name: 'tiny',
						lowerBound: defaultMinWidth,
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
						upperBound: defaultMaxWidth
					}
				],
				zIndex: {
					min: -1000,
					behind: -1,
					default: 1,
					front: 2,
					max: 1000
				}
			}),
						
			constructConfig: NGN.privateconst({
				layout: NGN.privateconst(custom => {
					const defaultSettings = this.defaultSettings.layout

					return {
						gutter: NGN.coalesce(custom.gutter, defaultSettings.gutter),
						minWidth: NGN.coalesce(custom.minWidth, defaultSettings.minWidth),
						maxWidth: NGN.coalesce(custom.maxWidth, defaultSettings.maxWidth)
					}
				}),
				typography: NGN.privateconst(custom => {
					const defaultSettings = this.defaultSettings.typography

					return {
						typeScaleRatio: NGN.coalesce(custom.typeScaleRatio, defaultSettings.typeScaleRatio),
						globalMultiplier: NGN.coalesce(custom.globalMultiplier, defaultSettings.globalMultiplier)
					}
				}),

				viewportWidthRanges: NGN.privateconst(custom => {
					const vwr = {}

					Object.keys(custom).forEach(key => {
						vwr[key] = custom[key]
					})

					return vwr
				}),

				zIndex: NGN.privateconst(custom => {
					const defaultSettings = this.defaultSettings.zIndex

					return {
						min: NGN.coalesce(custom.min, defaultSettings.min),
						behind: NGN.coalesce(custom.behind, defaultSettings.behind),
						default: NGN.coalesce(custom.default, defaultSettings.default),
						front: NGN.coalesce(custom.front, defaultSettings.front),
						max: NGN.coalesce(custom.max, defaultSettings.max)
					}
				}),
			}),
			
			typography: NGN.privateconst({
				fontSize: (type, upperBound) => {
					const match = this.constants.typography.definitions.filter(definition => {
						return upperBound >= definition.upperBound
					}).pop()

					if ( !match ) {
						console.error(`Font Size "${type}" not found`);
					}

					return match.fontSizes[type] * this.settings.typography.globalMultiplier
				},

				lineHeight: (type, upperBound) => {
					const fontSize = this.typography.fontSize(type, upperBound)

					return this.typography.optimalLineHeight(fontSize, upperBound)
				},

				optimalLineWidth: (fontSize, ratio) => {
					const lineHeight = Math.round(fontSize * ratio)

					return Math.pow(lineHeight, 2)
				},

				optimalLineHeight: (fontSize, upperBound) => {
					const typeScaleRatio = this.settings.typography.typeScaleRatio
					const optimalLineWidth = this.typography.optimalLineWidth(fontSize, typeScaleRatio)

					return Math.round((typeScaleRatio - ((1 / (2 * typeScaleRatio)) * (1 - (upperBound / optimalLineWidth)))) * fontSize)
				}
			}),
			
			layout: NGN.const({
				gutter: () => {
					const layout = this.settings.layout

					if (!layout.gutter) {
						console.warn('Layout Gutter Value has not been set!')
						return ''
					}

					return layout.gutter
				},
				
				minWidth: () => {
					const layout = this.settings.layout

					if (!layout.minWidth) {
						console.warn('Layout Minimum Width Value has not been set!')
						return ''
					}

					return layout.minWidth
				},

				maxWidth: () => {
					const layout = this.settings.layout

					if (!layout.maxWidth) {
						console.warn('Layout Maximum Width Value has not been set!')
						return ''
					}

					return layout.maxWidth
				},
			}),
			
			mediaQueries: NGN.privateconst({
				getBound: (type, name) => {
					const viewportWidthRanges = this.settings.viewportWidthRanges
					let index = 0;

					const range = viewportWidthRanges.filter((vwr, i) => {
						index = i
						return name === vwr.name
					}).pop()

					if (!range) {
						console.warn(`Viewport Width Range ${name} does not exist.`)
						return ''
					}

					switch (type) {
						case 'below':
							return `${range.lowerBound - 1}px`
							break

						case 'max':
							return `${range.upperBound - 1}px`
							break

						case 'at-min':
							return `${range.lowerBound}px`
							break

						case 'at-max':
							return index === viewportWidthRanges.length ? `${range.upperBound}px` : `${range.upperBound - 1}px`
							break

						case 'min':
							return `${range.lowerBound}px`
							break

						case 'above':
							return `${range.upperBound + 1}px`
							break
					}
				},

				generate: (type, range, nodes) => {
					const mediaQuery = postcss.atRule({
						name: 'media',
						params: '',
						nodes
					})

					const value = this.mediaQueries.getBound(type, range)

					if (type === 'below' || type === 'max') {
						mediaQuery.params = `screen and (max-width: ${value})`
					} else if (type === 'at') {
						mediaQuery.params = `screen and (min-width: ${this.mediaQueries.getBound('at-min', range)}) and (max-width: ${this.mediaQueries.getBound('at-max', range)})`
					} else {
						mediaQuery.params = `screen and (min-width: ${value})`
					}

					return mediaQuery
				},
			}),
			
			element: NGN.privateconst({
				margin: (type, fontSize, upperBound) => {
					switch (type) {
						case 'heading':
							return Math.round(this.typography.lineHeight(fontSize, upperBound) / this.settings.typography.typeScaleRatio)
							break
						
						case 'container':
							return Math.round(this.typography.lineHeight(fontSize, upperBound) * this.settings.typography.typeScaleRatio)
							break
							
						case 'block':
							return this.typography.lineHeight(fontSize, upperBound)
							break
						default:
							return '1em'
					}
				}
			}),
			
			viewport: NGN.privateconst({
				widthRanges: () => {
					return this.settings.viewportWidthRanges
				},

				numWidthRanges: () => {
					return this.settings.viewportWidthRanges.length
				},
			}),
			
			utilites: NGN.privateconst({
				getUnit: NGN.const(value => {
					return value.match(/\D+$/)[0]
				}),

				stripUnits: NGN.const(value => {
					const data = value.match(/\D+$/)

					return data.input.slice(0, data.index)
				})
			}),
			
			mixins: NGN.privateconst({
				constrainWidth: (hasPadding = true) => {
					const decls = []
				
		      decls.push(postcss.decl({
		        prop: 'width',
		        value: '100%'
		      }))
				
		      decls.push(postcss.decl({
		        prop: 'min-width',
		        value: `${this.layout.minWidth()}px`
		      }))
				
		      decls.push(postcss.decl({
		        prop: 'max-width',
		        value: `${this.layout.maxWidth()}px`
		      }))
				
		      decls.push(postcss.decl({
		        prop: 'margin',
		        value: '0 auto'
		      }))
				
		      if (hasPadding) {
		        decls.push(postcss.decl({
		          prop: 'padding-left',
		          value: this.layout.gutter()
		        }))
		        decls.push(postcss.decl({
		          prop: 'padding-right',
		          value: this.layout.gutter()
		        }))
		      }
				
		      return decls
				}
			}),
			
      coreStyles: NGN.privateconst(() => {
        const firstRange = this.viewport.widthRanges()[0]

        const reset = postcss.parse(fs.readFileSync(path.join(__dirname, 'stylesheets', 'reset.css')))
        const helpers = postcss.parse(fs.readFileSync(path.join(__dirname, 'stylesheets', 'helpers.css')))

				const newRule = (selector, decls = []) => {
		      const rule = postcss.rule({
		        selector
		      })
				
		      decls.forEach(decl => {
		        rule.append(postcss.decl({
		          prop: decl.prop,
		          value: decl.value
		        }))
		      })
				
		      return rule
		    }

		    const coreTypography = () => {
		      const ranges = this.viewport.widthRanges()
		      const mediaQueries = []
				
		      ranges.forEach((range, index) => {
		        let mediaQuery = postcss.atRule({
		          name: 'media',
		          params: '',
		          nodes: []
		        })
				
		        if ( index === ranges.length - 1 ) {
		          mediaQuery.params = `screen and (min-width: ${this.mediaQueries.getBound('min', range.name)})`
		        } else if ( index !== 0 ) {
		          mediaQuery.params = `screen and (min-width: ${this.mediaQueries.getBound('at-min', range.name)}) and (max-width: ${this.mediaQueries.getBound('at-max', range.name)})`
		        } else {
		          return
		        }
				
		        if (!mediaQuery) {
		          return
		        }
				
		        mediaQuery.nodes.push(newRule('.chassis', [
		          {
		            prop: 'font-size',
		            value: `${this.typography.fontSize('root', range.upperBound)}px`
		          }, {
		            prop: 'line-height',
		            value: `${this.typography.lineHeight('root', range.upperBound)}px`
		          }
		        ]))
				
		        for (let i = 1; i <= 6; i++) {
		          mediaQuery.nodes.push(headingStyles(`${i}`, range))
		        }
				
		        mediaQueries.push(mediaQuery)
		      })
				
		      return mediaQueries
		    }
				
		    const headingStyles = (level, range) => {
		      return newRule(`.chassis h${level}`, [
		        {
		          prop: 'font-size',
		          value: `${this.typography.fontSize(this.constants.typography.headingAliases[level], range.upperBound)}px`
		        }, {
		          prop: 'line-height',
		          value: `${this.typography.lineHeight(this.constants.typography.headingAliases[level], range.upperBound)}px`
		        }, {
		          prop: 'margin-bottom',
		          value: `${this.element.margin('heading', this.constants.typography.headingAliases[level], range.upperBound)}px`
		        }
		      ])
		    }

        const widthConstraint = newRule('.width-constraint', this.mixins.constrainWidth())
				
        const widthConstraintBelowMin = postcss.atRule({
          name: 'media',
          params: `screen and (max-width: ${this.layout.minWidth()}px)`,
          nodes: [
            newRule('.width-constraint', [
              {
                prop: 'padding-left',
                // TODO: check for percentage or vw/vh unit before parseFloat;
                // this will not work the same way when using px, ems, or rems
                // for Layout Gutter value
                value: `calc(${this.layout.minWidth()}px * ${parseFloat(this.layout.gutter())} / 100)`
              }, {
                prop: 'padding-right',
                // TODO: check for percentage or vw/vh unit before parseFloat;
                // this will not work the same way when using px, ems, or rems
                // for Layout Gutter value
                value: `calc(${this.layout.minWidth()}px * ${parseFloat(this.layout.gutter())} / 100)`
              }
            ])
          ]
        })
				
        const widthConstraintAboveMax = postcss.atRule({
          name: 'media',
          params: `screen and (min-width: ${this.layout.maxWidth()}px)`,
          nodes: [
            newRule('.width-constraint', [
              {
                prop: 'padding-left',
                // TODO: check for percentage or vw/vh unit before parseFloat;
                // this will not work the same way when using px, ems, or rems
                // for Layout Gutter value
                value: `calc(${this.layout.maxWidth()}px * ${parseFloat(this.layout.gutter())} / 100)`
              }, {
                prop: 'padding-right',
                // TODO: check for percentage or vw/vh unit before parseFloat;
                // this will not work the same way when using px, ems, or rems
                // for Layout Gutter value
                value: `calc(${this.layout.maxWidth()}px * ${parseFloat(this.layout.gutter())} / 100)`
              }
            ])
          ]
        })

        const base = newRule('.chassis', [
          {
            prop: 'min-width',
            value: `${this.layout.minWidth()}px`
          }, {
            prop: 'margin',
            value: '0'
          }, {
            prop: 'padding',
            value: '0'
          }, {
            prop: 'font-size',
            value: `${this.typography.fontSize('root', firstRange.upperBound)}px`
          }, {
            prop: 'line-height',
            value: `${this.typography.lineHeight('root', firstRange.upperBound)}px`
          }
        ])
				
        const formLegend = newRule('.chassis legend', [
          {
            prop: 'font-size',
            value: `${this.typography.fontSize(this.constants.typography.formLegendAlias, firstRange.upperBound)}px`
          }, {
            prop: 'line-height',
            value: `${this.typography.lineHeight(this.constants.typography.formLegendAlias, firstRange.upperBound)}px`
          }, {
            prop: 'margin-bottom',
            value: `${this.element.margin('heading', this.constants.typography.formLegendAlias, firstRange.upperBound)}px`
          }
        ])
				
        const containers = newRule('.chassis section, .chassis nav, .chassis form', [{
          prop: 'margin-bottom',
          value: `${this.element.margin('container', 'root', firstRange.upperBound)}px`
        }])
				
        const blocks = newRule('.chassis nav section, .chassis section nav, .chassis nav nav, .chassis article, .chassis fieldset, .chassis figure, .chassis pre, .chassis blockquote, .chassis table, .chassis canvas, .chassis embed', [{
          prop: 'margin-bottom',
          value: `${this.element.margin('block', 'root', firstRange.upperBound)}px`
        }])
				
        const p = newRule('.chassis p', [{
          prop: 'margin-bottom',
          value: '1em'
        }])

        const coreStyles = reset.append(helpers)
          .append(widthConstraint)
          .append(widthConstraintBelowMin)
          .append(widthConstraintAboveMax)
          .append(base)

        for (let i = 1; i <=6; i++) {
          coreStyles.append(headingStyles(`${i}`, firstRange))
        }

        coreStyles.append(formLegend)
          .append(containers)
          .append(blocks)
          .append(p)
				
        coreTypography().forEach(mediaQuery => {
          coreStyles.append(mediaQuery)
        })

        return coreStyles
      })
		})

		Object.defineProperty(this, 'settings', NGN.const({
			layout: cfg.hasOwnProperty('layout') ? this.constructConfig.layout(cfg.layout) : this.defaultSettings.layout,
			typography: cfg.hasOwnProperty('typography') ? this.constructConfig.typography(cfg.typography) : this.defaultSettings.typography,
			viewportWidthRanges: cfg.hasOwnProperty('viewportWidthRanges') ? this.constructConfig.viewportWidthRanges(cfg.viewportWidthRanges) : this.defaultSettings.viewportWidthRanges,
			zIndex: cfg.hasOwnProperty('zIndex') ? this.constructConfig.zIndex(cfg.zIndex) : this.defaultSettings.zIndex
		}))
	}
}

module.exports = ChassisProject