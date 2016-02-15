PATH := ./node_modules/.bin:./bin/:$(PATH)
SHELL := /bin/bash
BABEL := babel --retain-lines
JPM := $(shell pwd)/node_modules/.bin/jpm
.DEFAULT_GOAL := help

static_sources = $(shell find -L html -type f ! -name '*.js')
static_dests = $(static_sources:%=built/%)

jsx_sources = $(wildcard html/js/*.js)
jsx_dests = $(jsx_sources:%=built/%)

addon_js_sources = $(shell find addon -name '*.js')
addon_js_dests = $(addon_js_sources:%=built/%)

addon_static_sources = $(shell find addon -type f ! -name '*.js')
addon_static_dests = $(addon_static_sources:%=built/%)

# A debugging tool, do make print-addon_js_sources to see that variable
print-%: ; @echo $* is \"$($*)\"

.PHONY: html
html: npm jsx $(static_dests)

.PHONY: jsx
jsx: $(jsx_dests)

built/html/%.js: html/%.js
	@mkdir -p $(@D)
	$(BABEL) $< > $@

built/html/%: html/%
	@mkdir -p $(@D)
	cp $< $@

.PHONY: xpi
xpi: built/addon/Eim0oucoeeyeiz1K@hashroom-0.0.1.xpi

built/addon/Eim0oucoeeyeiz1K@hashroom-0.0.1.xpi: $(addon_js_sources) $(addon-static_sources)
	cd built/addon/
	$(JPM) xpi

.PHONY: addon
addon: npm $(addon_js_dests) $(addon_static_dests)

built/addon/%.js: addon/%.js
	@mkdir -p $(@D)
	$(BABEL) $< > $@

built/addon/%: addon/%
	@mkdir -p $(@D)
	cp $< $@

.PHONY: npm
npm: built/.npm-install.log

built/.npm-install.log: package.json
	@mkdir -p built/
	npm install > built/.npm-install.log

# This causes intermediate files to be kept:
.SECONDARY:

.PHONY: clean
clean:
	rm -r built/

.PHONY: help
help:
	@echo "Usage: ./bin/run-addon"
	@echo "   or: ./bin/run-server"
	@echo "Those scripts will call this file."
	@echo "Also:  make xpi"
