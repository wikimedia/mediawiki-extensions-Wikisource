/**
 * @param {string} toolUrl
 * @class
 * @constructor
 */
function OcrTool( toolUrl ) {
	this.toolUrl = toolUrl;
}

/**
 * Get the full URL to the OCR tool.
 *
 * @param {string} image URL of the image on Commons.
 * @param {string} engine Either 'google' or 'tesseract'.
 * @param {string[]} langs Array of language codes.
 * @return {string} Full URL to the tool.
 */
OcrTool.prototype.getUrl = function ( image, engine, langs ) {
	// @TODO Use URL() here when it's permitted in MediaWiki.
	return this.toolUrl + '/api.php' +
		'?engine=' + engine +
		'&langs[]=' + langs.join( '&langs[]=' ) +
		'&image=' + encodeURIComponent( image ) +
		'&uselang=' + mw.config.get( 'wgUserLanguage' );
};

module.exports = OcrTool;
