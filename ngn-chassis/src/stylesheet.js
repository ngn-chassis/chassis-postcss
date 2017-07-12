const postcss = require('postcss')
const nesting = require('postcss-nesting')

class ChassisStylesheet {
	constructor (chassis, tree) {
		this.chassis = chassis
		this.tree = tree
	}

	get css () {
		// Process all but 'include' and 'extend' mixins
		// These need to be processed after the unnest operation to properly resolve
		// nested selectors
		this.tree.walkAtRules('chassis', (atRule) => {
			if (!(atRule.params.startsWith('include') || atRule.params.startsWith('extend'))) {
				this.processAtRule(atRule)
			}
		})
		
		// cssnext nesting isn't handled correctly, so we're short-circuiting it
		// by handling unnesting here
		this.unnest()
		
		let output = postcss.parse(this.tree)
		
		// Process remaining 'extend' mixins
		output.walkAtRules('chassis', (atRule) => {
			if (atRule.params.startsWith('extend')) {
				this.processAtRule(atRule)
			}
		})
		
		// Process remaining 'include' mixins
		output.walkAtRules('chassis', (atRule) => this.processAtRule(atRule))
		
		// Cleanup empty rulesets and prepend .chassis namespace to all selectors
		output.walkRules((rule) => {
			if (rule.nodes.length === 0) {
				rule.remove()
				return
			}

			rule.selector = rule.selector === 'html' || rule.selector === ':root'  ? rule.selector.trim() : `.chassis ${rule.selector.trim()}`

			if (rule.selector.includes(',')) {
				rule.selector = rule.selector.split(',').map((selector) => selector.trim()).join(', .chassis ')
			}
		})

		return output
	}

	getAtRuleProperties (atRule) {
		let params = atRule.params.split(' ')

		return {
			source: atRule.source.start,
			mixin: params[0],
			args: params.length > 1 ? params.slice(1) : null,
			nodes: atRule.nodes || []
		}
	}

	processAtRule (atRule) {
		let data = Object.assign({
			root: this.tree,
			atRule
		}, this.getAtRuleProperties(atRule))
		
		if (data.mixin === 'extend') {
			if (this.chassis.extensions.hasOwnProperty(data.args[0])) {
				this.chassis.extensions[data.args[0]].push(atRule.parent.selector)
			} else {
				this.chassis.extensions[data.args[0]] = [atRule.parent.selector]
			}
		}
		
		this.chassis.atRules.process(data)
	}

	unnest () {
		this.tree = nesting.process(this.tree)
	}
}

module.exports = ChassisStylesheet
