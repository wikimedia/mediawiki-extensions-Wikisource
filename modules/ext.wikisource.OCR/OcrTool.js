var mwLocalStorage = require( 'mediawiki.storage' ).local;

/**
 * This is the central model for the OCR process.
 *
 * @param {string} toolUrl Base URL for the OCR tool.
 * @class
 * @constructor
 */
function OcrTool( toolUrl ) {
	OO.EventEmitter.call( this );

	// Event names.
	this.events = {
		cancelling: 'cancelling',
		textExtractStart: 'textExtractStart',
		textExtracted: 'textExtracted',
		textExtractEnd: 'textExtractEnd'
	};

	// Base URL of the tool.
	this.toolUrl = toolUrl;
	// Engine name.
	this.engine = 'tesseract';
	// Array of language codes.
	this.langs = [ mw.config.get( 'wgContentLanguage' ) ];
	// Image URL.
	this.image = null;
	// Whether an OCR request is in progress.
	this.inProgress = false;
	// Whether to show the onboarding pulsating dot and popup.
	this.showOnboarding = true;

	this.loadConfig();
}

OO.mixinClass( OcrTool, OO.EventEmitter );

OcrTool.prototype.saveConfig = function () {
	mwLocalStorage.set( 'wikisource-ocr', JSON.stringify( {
		engine: this.engine,
		showOnboarding: this.showOnboarding
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
	if ( config.showOnboarding === undefined ) {
		config.showOnboarding = true;
	}
	this.showOnboarding = config.showOnboarding;
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
 * Whether the onboarding popup should be shown.
 *
 * @return {boolean}
 */
OcrTool.prototype.getShowOnboarding = function () {
	return this.showOnboarding;
};

OcrTool.prototype.setShowOnboarding = function ( showOnboarding ) {
	this.showOnboarding = !!showOnboarding;
	this.saveConfig();
};

/**
 * Get the full URL to the OCR tool.
 *
 * @param {boolean} api Whether to include the API endpoint.
 * @return {string} Full URL to the tool.
 */
OcrTool.prototype.getUrl = function ( api ) {
	var endpoint = api ? '/api.php' : '/';
	// @TODO Use URL() here when it's permitted in MediaWiki.
	return this.toolUrl + endpoint +
		'?engine=' + this.engine +
		'&langs[]=' + this.langs.join( '&langs[]=' ) +
		'&image=' + encodeURIComponent( this.image ) +
		'&uselang=' + mw.config.get( 'wgUserLanguage' );
};

OcrTool.prototype.setImage = function ( image ) {
	this.image = image;
};

OcrTool.prototype.cancel = function () {
	this.inProgress = false;
	this.emit( this.events.cancelling );
};

OcrTool.prototype.extractText = function () {
	this.inProgress = true;
	this.emit( this.events.textExtractStart );
	var ocrTool = this;
	$.ajax( {
		url: ocrTool.getUrl( true ),
		dataType: 'json',
		success: function ( result ) {
			if ( !ocrTool.inProgress ) {
				// If the user has clicked 'cancel', ignore the result.
				return;
			}
			ocrTool.emit( ocrTool.events.textExtracted, result );
		},
		error: function ( result ) {
			ocrTool.emit( ocrTool.events.textExtracted, result );
		},
		complete: function ( jqXHR, textStatus ) {
			ocrTool.emit( ocrTool.events.textExtractEnd, jqXHR, textStatus );
		}
	} );
};

module.exports = OcrTool;
