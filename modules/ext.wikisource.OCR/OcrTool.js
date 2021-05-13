var mwLocalStorage = require( 'mediawiki.storage' ).local;

/**
 * @param {string} toolUrl
 * @class
 * @constructor
 */
function OcrTool( toolUrl ) {
	this.toolUrl = toolUrl;
	this.loadConfig();
}

OcrTool.prototype.saveConfig = function () {
	mwLocalStorage.set( 'wikisource-ocr', JSON.stringify( {
		engine: this.engine
	} ) );
};

OcrTool.prototype.loadConfig = function () {
	var config = JSON.parse( mwLocalStorage.get( 'wikisource-ocr' ) );
	if ( config === null ) {
		config = {};
	}
	if ( config.engine === undefined ) {
		config.engine = 'tesseract';
	}
	this.engine = config.engine;
};

/**
 * @param {string} engine
 */
OcrTool.prototype.setEngine = function ( engine ) {
	this.engine = engine;
	this.saveConfig();
};

/**
 * @return {string}
 */
OcrTool.prototype.getEngine = function () {
	return this.engine;
};

/**
 * Get the full URL to the OCR tool.
 *
 * @param {boolean} api Whether to include the API endpoint.
 * @param {string} image URL of the image on Commons.
 * @return {string} Full URL to the tool.
 */
OcrTool.prototype.getUrl = function ( api, image ) {
	var endpoint = api ? '/api.php' : '/';
	// @TODO Use URL() here when it's permitted in MediaWiki.
	return this.toolUrl + endpoint +
		'?engine=' + this.engine +
		'&langs[]=' + mw.config.get( 'wgContentLanguage' ) +
		'&image=' + encodeURIComponent( image ) +
		'&uselang=' + mw.config.get( 'wgUserLanguage' );
};

module.exports = OcrTool;
