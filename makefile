build:
	demeteorizer --output build
	cd build && npm install phantomjs --save
production: build
	modulus deploy -p startupcol-telescope build
.PHONY: production build