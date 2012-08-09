NPM := npm
NPM_MODULES := mysql@2.0.0-alpha3 node-markdown hashish

default:
	${NPM} install ${NPM_MODULES}
